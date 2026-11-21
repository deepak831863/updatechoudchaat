import { createServerFn } from "@tanstack/react-start";
import { z, ZodError } from "zod";
import { getMongoDatabase } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { isConversationParticipant } from "./authorization";

export type Person = {
  userId: string;
  displayName: string;
  email: string | null;
  imageUrl: string | null;
  online: boolean;
  lastSeen: number;
};

export type Conversation = {
  id: string;
  otherId: string;
  title: string;
  email: string | null;
  imageUrl: string | null;
  self: boolean;
  online: boolean;
  lastSeen: number;
  preview: string;
  previewFromMe: boolean;
  previewAt: number | null;
  unread: number;
  typing: boolean;
  updatedAt: number;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  status: "sent" | "delivered" | "read";
  deletedEveryone: boolean;
  createdAt: number;
};

type ConversationRow = {
  id: string;
  lowId: string;
  highId: string;
  updatedAt: number;
};

function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Invalid input");
  return result.data;
}

function friendly(error: unknown): never {
  if (error instanceof ZodError) throw new Error(error.issues[0]?.message ?? "Check that and try again.");
  if (error instanceof Error && error.message.length < 180 && !/mongo|server selection|password|uri/i.test(error.message)) {
    throw error;
  }
  console.error(error);
  throw new Error("Something went wrong. Try again.");
}

async function touchProfile(db: Awaited<ReturnType<typeof getMongoDatabase>>, userId: string) {
  const user = await db.collection("user").findOne<{ id: string; name?: string; email?: string; image?: string }>(
    { id: userId },
  );
  if (!user) throw new Error("Sign in required");
  await db.collection("profiles").updateOne(
    { userId },
    {
      $set: {
        displayName: user.name ?? "CloudChat user",
        email: user.email ?? null,
        imageUrl: user.image ?? null,
        lastSeen: Date.now(),
      },
    },
    { upsert: true },
  );

  await db.collection("conversations").updateOne(
    { lowId: userId, highId: userId },
    { $setOnInsert: { id: crypto.randomUUID(), lowId: userId, highId: userId, updatedAt: Date.now() } },
    { upsert: true },
  );
}

async function loadConversation(
  db: Awaited<ReturnType<typeof getMongoDatabase>>,
  userId: string,
  conversationId: string,
): Promise<ConversationRow | null> {
  const conversation = await db.collection("conversations").findOne<ConversationRow>({
    id: conversationId,
  });
  return conversation && isConversationParticipant(conversation, userId) ? conversation : null;
}

function mapMessage(row: {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  status: string;
  deletedEveryone: boolean;
  createdAt: number;
}): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    body: row.deletedEveryone ? "" : row.body,
    status: row.status === "read" || row.status === "delivered" ? row.status : "sent",
    deletedEveryone: row.deletedEveryone,
    createdAt: row.createdAt,
  };
}

export const inbox = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Conversation[]> => {
    try {
      const db = await getMongoDatabase();
      const uid = context.userId;
      await touchProfile(db, uid);
      const now = Date.now();
      const conversations = await db.collection("conversations").find({
        $or: [{ lowId: uid }, { highId: uid }],
      }).sort({ updatedAt: -1 }).toArray();

      await db.collection("messages").updateMany(
        {
          conversationId: { $in: conversations.map((conversation) => conversation.id) },
          senderId: { $ne: uid },
          status: "sent",
          deletedEveryone: false,
        },
        { $set: { status: "delivered" } },
      );

      const result: Conversation[] = [];
      for (const conversation of conversations as unknown as ConversationRow[]) {
        const otherId = conversation.lowId === uid ? conversation.highId : conversation.lowId;
        const self = otherId === uid;
        const profile = self ? null : await db.collection("profiles").findOne<{ displayName: string; email: string | null; imageUrl: string | null; lastSeen: number }>({ userId: otherId });
        const hides = await db.collection("hides").find({ userId: uid }).project({ messageId: 1 }).toArray();
        const hiddenIds = new Set(hides.map((hide) => String(hide.messageId)));
        const last = await db.collection("messages").find({
          conversationId: conversation.id,
          id: { $nin: [...hiddenIds] },
        }).sort({ createdAt: -1 }).limit(1).next();
        const unread = await db.collection("messages").countDocuments({
          conversationId: conversation.id,
          senderId: { $ne: uid },
          status: { $ne: "read" },
          deletedEveryone: false,
          id: { $nin: [...hiddenIds] },
        });
        const typing = await db.collection("typing").findOne({
          conversationId: conversation.id,
          userId: { $ne: uid },
          untilAt: { $gt: new Date(now) },
        });
        let preview = "No messages yet";
        if (last?.deletedEveryone) preview = "This message was deleted";
        else if (last?.body) preview = last.senderId === uid ? `You: ${last.body}` : String(last.body);

        result.push({
          id: conversation.id,
          otherId,
          title: self ? "Message yourself" : profile?.displayName ?? "CloudChat user",
          email: self ? null : profile?.email ?? null,
          imageUrl: self ? null : profile?.imageUrl ?? null,
          self,
          online: self ? true : Boolean(profile && profile.lastSeen > now - 35_000),
          lastSeen: profile?.lastSeen ?? 0,
          preview,
          previewFromMe: last ? last.senderId === uid : false,
          previewAt: last ? Number(last.createdAt) : null,
          unread,
          typing: Boolean(typing),
          updatedAt: Number(conversation.updatedAt),
        });
      }
      return result;
    } catch (error) {
      friendly(error);
    }
  });

const threadInput = z.object({ conversationId: z.string().uuid() });

export const thread = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseInput(threadInput, input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<{ messages: ChatMessage[]; typing: boolean }> => {
    try {
      const db = await getMongoDatabase();
      const uid = context.userId;
      await touchProfile(db, uid);
      const conversation = await loadConversation(db, uid, data.conversationId);
      if (!conversation) throw new Error("Conversation not found");
      await db.collection("messages").updateMany(
        { conversationId: conversation.id, senderId: { $ne: uid }, status: { $ne: "read" }, deletedEveryone: false },
        { $set: { status: "read" } },
      );
      const hides = await db.collection("hides").find({ userId: uid }).project({ messageId: 1 }).toArray();
      const hiddenIds = new Set(hides.map((hide) => String(hide.messageId)));
      const rows = await db.collection("messages").find({
        conversationId: conversation.id,
        id: { $nin: [...hiddenIds] },
      }).sort({ createdAt: 1 }).limit(500).toArray();
      const typing = await db.collection("typing").findOne({
        conversationId: conversation.id,
        userId: { $ne: uid },
        untilAt: { $gt: new Date() },
      });
      return {
        messages: rows.map((row) => mapMessage(row as unknown as Parameters<typeof mapMessage>[0])),
        typing: Boolean(typing),
      };
    } catch (error) {
      friendly(error);
    }
  });

const sendInput = z.object({
  conversationId: z.string().uuid(),
  body: z.string().trim().min(1, "Message is empty").max(4000, "Message is too long"),
});

export const sendMessage = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseInput(sendInput, input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<ChatMessage> => {
    try {
      const db = await getMongoDatabase();
      const uid = context.userId;
      await touchProfile(db, uid);
      const conversation = await loadConversation(db, uid, data.conversationId);
      if (!conversation) throw new Error("Conversation not found");
      const peer = conversation.lowId === uid ? conversation.highId : conversation.lowId;
      let status: ChatMessage["status"] = "sent";
      if (peer === uid) status = "read";
      else {
        const peerProfile = await db.collection("profiles").findOne<{ lastSeen: number }>({ userId: peer });
        if (peerProfile && peerProfile.lastSeen > Date.now() - 35_000) status = "delivered";
      }
      const now = Date.now();
      const message = {
        id: crypto.randomUUID(),
        conversationId: conversation.id,
        senderId: uid,
        body: data.body,
        status,
        deletedEveryone: false,
        createdAt: now,
      };
      await db.collection("messages").insertOne(message);
      await db.collection("conversations").updateOne(
        { id: conversation.id },
        { $set: { updatedAt: now } },
      );
      return mapMessage(message);
    } catch (error) {
      friendly(error);
    }
  });

const deleteInput = z.object({
  messageId: z.string().uuid(),
  scope: z.enum(["me", "everyone"]),
});

export const deleteMessage = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseInput(deleteInput, input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    try {
      const db = await getMongoDatabase();
      const uid = context.userId;
      const message = await db.collection("messages").findOne<{
        id: string;
        senderId: string;
        conversationId: string;
      }>({ id: data.messageId });
      if (!message) throw new Error("Message not found");
      const conversation = await loadConversation(db, uid, message.conversationId);
      if (!conversation) throw new Error("Message not found");
      if (data.scope === "everyone") {
        if (message.senderId !== uid) throw new Error("Only the sender can delete for everyone");
        await db.collection("messages").updateOne(
          { id: message.id },
          { $set: { deletedEveryone: true, body: "" } },
        );
      } else {
        await db.collection("hides").updateOne(
          { messageId: message.id, userId: uid },
          { $setOnInsert: { messageId: message.id, userId: uid } },
          { upsert: true },
        );
      }
      return { ok: true };
    } catch (error) {
      friendly(error);
    }
  });

const typingInput = z.object({
  conversationId: z.string().uuid(),
  active: z.boolean(),
});

export const setTyping = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseInput(typingInput, input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    try {
      const db = await getMongoDatabase();
      const uid = context.userId;
      const conversation = await loadConversation(db, uid, data.conversationId);
      if (!conversation) throw new Error("Conversation not found");
      if (!data.active || conversation.lowId === conversation.highId) {
        await db.collection("typing").deleteOne({ conversationId: conversation.id, userId: uid });
      } else {
        await db.collection("typing").updateOne(
          { conversationId: conversation.id, userId: uid },
          { $set: { untilAt: new Date(Date.now() + 3_000) } },
          { upsert: true },
        );
      }
      return { ok: true };
    } catch (error) {
      friendly(error);
    }
  });

const searchInput = z.object({ query: z.string().trim().min(1).max(80) });

export const searchUsers = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseInput(searchInput, input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<Person[]> => {
    try {
      const db = await getMongoDatabase();
      const uid = context.userId;
      await touchProfile(db, uid);
      const escaped = data.query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const users = await db.collection("user").find({
        id: { $ne: uid },
        $or: [
          { name: { $regex: escaped, $options: "i" } },
          { email: { $regex: escaped, $options: "i" } },
        ],
      }).sort({ name: 1 }).limit(20).toArray();
      const people: Person[] = [];
      for (const user of users as unknown as Array<{ id: string; name?: string; email?: string; image?: string }>) {
        const profile = await db.collection("profiles").findOne<{ lastSeen: number }>({ userId: user.id });
        people.push({
          userId: user.id,
          displayName: user.name ?? "CloudChat user",
          email: user.email ?? null,
          imageUrl: user.image ?? null,
          online: Boolean(profile && profile.lastSeen > Date.now() - 35_000),
          lastSeen: profile?.lastSeen ?? 0,
        });
      }
      return people;
    } catch (error) {
      friendly(error);
    }
  });

const openInput = z.object({ otherUserId: z.string().trim().min(1).max(200) });

export const openChat = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseInput(openInput, input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<{ conversationId: string }> => {
    try {
      const db = await getMongoDatabase();
      const uid = context.userId;
      await touchProfile(db, uid);
      const other = data.otherUserId;
      if (other !== uid) {
        const found = await db.collection("user").findOne<{ id: string; name?: string; email?: string; image?: string }>({ id: other });
        if (!found) throw new Error("User not found");
        await db.collection("profiles").updateOne(
          { userId: other },
          {
            $setOnInsert: {
              displayName: found.name ?? "CloudChat user",
              email: found.email ?? null,
              imageUrl: found.image ?? null,
              lastSeen: Date.now(),
            },
          },
          { upsert: true },
        );
      }
      const lowId = uid < other ? uid : other;
      const highId = uid < other ? other : uid;
      const existing = await db.collection("conversations").findOne<{ id: string }>({ lowId, highId });
      if (existing) return { conversationId: existing.id };
      const id = crypto.randomUUID();
      await db.collection("conversations").insertOne({ id, lowId, highId, updatedAt: Date.now() });
      return { conversationId: id };
    } catch (error) {
      friendly(error);
    }
  });
