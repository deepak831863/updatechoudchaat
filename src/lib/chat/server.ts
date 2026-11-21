import { createServerFn } from "@tanstack/react-start";
import { z, ZodError } from "zod";
import { getSql, type Sql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";

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

function num(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string" && value) {
    const asNum = Number(value);
    if (Number.isFinite(asNum) && asNum > 1e11) return asNum;
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function asBool(value: unknown): boolean {
  return value === true || value === "t" || value === "true" || value === 1;
}

function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Invalid input");
  }
  return result.data;
}

function likePattern(query: string): string {
  const escaped = query.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  return `%${escaped}%`;
}

function friendly(error: unknown): never {
  if (error instanceof ZodError) {
    throw new Error(error.issues[0]?.message ?? "Check that and try again.");
  }
  if (
    error instanceof Error &&
    error.message &&
    error.message.length < 180 &&
    !/sql|relation|syntax|password authentication/i.test(error.message)
  ) {
    throw error;
  }
  console.error(error);
  throw new Error("Something went wrong. Try again.");
}

async function touchProfile(sql: Sql, userId: string): Promise<void> {
  const rows = await sql<{ user_id: string }>`
    insert into cc_profiles (user_id, display_name, email, image_url, last_seen)
    select "id", "name", "email", "image", now()
    from "user"
    where "id" = ${userId}
    on conflict (user_id) do update set
      display_name = excluded.display_name,
      email = excluded.email,
      image_url = excluded.image_url,
      last_seen = now()
    returning user_id
  `;
  if (!rows[0]) throw new Error("Sign in required");
  await sql`
    insert into cc_conversations (id, low_id, high_id)
    values (${crypto.randomUUID()}, ${userId}, ${userId})
    on conflict (low_id, high_id) do nothing
  `;
}

async function loadConversation(sql: Sql, userId: string, conversationId: string) {
  const rows = await sql<{ id: string; low_id: string; high_id: string }>`
    select id, low_id, high_id
    from cc_conversations
    where id = ${conversationId}
      and (low_id = ${userId} or high_id = ${userId})
  `;
  return rows[0] ?? null;
}

function mapMessage(row: {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  status: string;
  deleted_everyone: unknown;
  created_at: unknown;
}): ChatMessage {
  const deleted = asBool(row.deleted_everyone);
  const status = row.status === "read" || row.status === "delivered" ? row.status : "sent";
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: deleted ? "" : row.body,
    status,
    deletedEveryone: deleted,
    createdAt: num(row.created_at),
  };
}

export const inbox = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Conversation[]> => {
    try {
      const sql = await getSql();
      const uid = context.userId;
      await touchProfile(sql, uid);
      await sql`
        update cc_messages m
        set status = 'delivered'
        where m.sender_id <> ${uid}
          and m.status = 'sent'
          and m.deleted_everyone = false
          and m.conversation_id in (
            select id from cc_conversations where low_id = ${uid} or high_id = ${uid}
          )
      `;
      const rows = await sql<{
        id: string;
        updated_at: unknown;
        other_id: string;
        display_name: string;
        image_url: string | null;
        email: string | null;
        last_seen: unknown;
        online: unknown;
        last_body: string | null;
        last_sender: string | null;
        last_deleted: unknown;
        last_at: unknown;
        unread: unknown;
        typing: unknown;
      }>`
        select
          c.id,
          (extract(epoch from c.updated_at) * 1000)::bigint as updated_at,
          case when c.low_id = ${uid} then c.high_id else c.low_id end as other_id,
          p.display_name,
          p.image_url,
          p.email,
          (extract(epoch from p.last_seen) * 1000)::bigint as last_seen,
          (p.last_seen > now() - interval '35 seconds') as online,
          lm.body as last_body,
          lm.sender_id as last_sender,
          lm.deleted_everyone as last_deleted,
          (extract(epoch from lm.created_at) * 1000)::bigint as last_at,
          coalesce(uc.unread, 0) as unread,
          (t.until_at > now()) as typing
        from cc_conversations c
        join cc_profiles p
          on p.user_id = case when c.low_id = ${uid} then c.high_id else c.low_id end
        left join lateral (
          select body, sender_id, deleted_everyone, created_at
          from cc_messages m
          where m.conversation_id = c.id
            and not exists (
              select 1 from cc_hides h where h.message_id = m.id and h.user_id = ${uid}
            )
          order by m.created_at desc
          limit 1
        ) lm on true
        left join lateral (
          select count(*)::int as unread
          from cc_messages m
          where m.conversation_id = c.id
            and m.sender_id <> ${uid}
            and m.status <> 'read'
            and m.deleted_everyone = false
            and not exists (
              select 1 from cc_hides h where h.message_id = m.id and h.user_id = ${uid}
            )
        ) uc on true
        left join cc_typing t
          on t.conversation_id = c.id and t.user_id <> ${uid}
        where c.low_id = ${uid} or c.high_id = ${uid}
        order by c.updated_at desc
      `;
      return rows.map((row) => {
        const self = row.other_id === uid;
        const deleted = asBool(row.last_deleted);
        const hasLast = row.last_body !== null || deleted;
        let preview = "No messages yet";
        if (hasLast && deleted) preview = "This message was deleted";
        else if (row.last_body) {
          preview = row.last_sender === uid ? `You: ${row.last_body}` : row.last_body;
        }
        return {
          id: row.id,
          otherId: row.other_id,
          title: self ? "Message yourself" : row.display_name,
          email: self ? null : row.email,
          imageUrl: self ? null : row.image_url,
          self,
          online: self ? true : asBool(row.online),
          lastSeen: num(row.last_seen),
          preview,
          previewFromMe: row.last_sender === uid,
          previewAt: row.last_at == null ? null : num(row.last_at),
          unread: Number(row.unread) || 0,
          typing: asBool(row.typing),
          updatedAt: num(row.updated_at),
        };
      });
    } catch (error) {
      friendly(error);
    }
  });

const threadInput = z.object({
  conversationId: z.string().uuid(),
});

export const thread = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseInput(threadInput, input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<{ messages: ChatMessage[]; typing: boolean }> => {
    try {
      const sql = await getSql();
      const uid = context.userId;
      await touchProfile(sql, uid);
      const convo = await loadConversation(sql, uid, data.conversationId);
      if (!convo) throw new Error("Conversation not found");
      await sql`
        update cc_messages
        set status = 'read'
        where conversation_id = ${convo.id}
          and sender_id <> ${uid}
          and status <> 'read'
          and deleted_everyone = false
      `;
      const rows = await sql<{
        id: string;
        conversation_id: string;
        sender_id: string;
        body: string;
        status: string;
        deleted_everyone: unknown;
        created_at: unknown;
      }>`
        select
          id, conversation_id, sender_id, body, status, deleted_everyone,
          (extract(epoch from created_at) * 1000)::bigint as created_at
        from cc_messages m
        where m.conversation_id = ${convo.id}
          and not exists (
            select 1 from cc_hides h where h.message_id = m.id and h.user_id = ${uid}
          )
        order by m.created_at asc
        limit 500
      `;
      const typingRows = await sql<{ typing: unknown }>`
        select (until_at > now()) as typing
        from cc_typing
        where conversation_id = ${convo.id} and user_id <> ${uid}
        limit 1
      `;
      return {
        messages: rows.map(mapMessage),
        typing: asBool(typingRows[0]?.typing),
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
      const sql = await getSql();
      const uid = context.userId;
      await touchProfile(sql, uid);
      const convo = await loadConversation(sql, uid, data.conversationId);
      if (!convo) throw new Error("Conversation not found");
      const peer = convo.low_id === uid ? convo.high_id : convo.low_id;
      let status: ChatMessage["status"] = "sent";
      if (peer === uid) status = "read";
      else {
        const onlineRows = await sql<{ online: unknown }>`
          select (last_seen > now() - interval '35 seconds') as online
          from cc_profiles
          where user_id = ${peer}
        `;
        if (asBool(onlineRows[0]?.online)) status = "delivered";
      }
      const id = crypto.randomUUID();
      const rows = await sql<{
        id: string;
        conversation_id: string;
        sender_id: string;
        body: string;
        status: string;
        deleted_everyone: unknown;
        created_at: unknown;
      }>`
        insert into cc_messages (id, conversation_id, sender_id, body, status)
        values (${id}, ${convo.id}, ${uid}, ${data.body}, ${status})
        returning
          id, conversation_id, sender_id, body, status, deleted_everyone,
          (extract(epoch from created_at) * 1000)::bigint as created_at
      `;
      await sql`update cc_conversations set updated_at = now() where id = ${convo.id}`;
      return mapMessage(rows[0]);
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
      const sql = await getSql();
      const uid = context.userId;
      const rows = await sql<{
        id: string;
        sender_id: string;
        conversation_id: string;
      }>`
        select m.id, m.sender_id, m.conversation_id
        from cc_messages m
        join cc_conversations c on c.id = m.conversation_id
        where m.id = ${data.messageId}
          and (c.low_id = ${uid} or c.high_id = ${uid})
      `;
      const message = rows[0];
      if (!message) throw new Error("Message not found");
      if (data.scope === "everyone") {
        if (message.sender_id !== uid) throw new Error("Only the sender can delete for everyone");
        await sql`
          update cc_messages
          set deleted_everyone = true, body = ''
          where id = ${message.id}
        `;
      } else {
        await sql`
          insert into cc_hides (message_id, user_id)
          values (${message.id}, ${uid})
          on conflict do nothing
        `;
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
      const sql = await getSql();
      const uid = context.userId;
      const convo = await loadConversation(sql, uid, data.conversationId);
      if (!convo) throw new Error("Conversation not found");
      if (!data.active || convo.low_id === convo.high_id) {
        await sql`delete from cc_typing where conversation_id = ${convo.id} and user_id = ${uid}`;
      } else {
        await sql`
          insert into cc_typing (conversation_id, user_id, until_at)
          values (${convo.id}, ${uid}, now() + interval '3 seconds')
          on conflict (conversation_id, user_id)
          do update set until_at = excluded.until_at
        `;
      }
      return { ok: true };
    } catch (error) {
      friendly(error);
    }
  });

const searchInput = z.object({
  query: z.string().trim().min(1).max(80),
});

export const searchUsers = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseInput(searchInput, input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<Person[]> => {
    try {
      const sql = await getSql();
      const uid = context.userId;
      await touchProfile(sql, uid);
      const pattern = likePattern(data.query);
      const rows = await sql<{
        user_id: string;
        display_name: string;
        email: string | null;
        image_url: string | null;
        last_seen: unknown;
        online: unknown;
      }>`
        select
          u."id" as user_id,
          u."name" as display_name,
          u."email" as email,
          u."image" as image_url,
          (extract(epoch from p.last_seen) * 1000)::bigint as last_seen,
          (p.last_seen > now() - interval '35 seconds') as online
        from "user" u
        left join cc_profiles p on p.user_id = u."id"
        where u."id" <> ${uid}
          and (
            u."name" ilike ${pattern} escape ${"\\"}
            or u."email" ilike ${pattern} escape ${"\\"}
          )
        order by u."name" asc
        limit 20
      `;
      return rows.map((row) => ({
        userId: row.user_id,
        displayName: row.display_name,
        email: row.email,
        imageUrl: row.image_url,
        online: asBool(row.online),
        lastSeen: num(row.last_seen),
      }));
    } catch (error) {
      friendly(error);
    }
  });

const openInput = z.object({
  otherUserId: z.string().trim().min(1).max(200),
});

export const openChat = createServerFn({ method: "POST" })
  .validator((input: unknown) => parseInput(openInput, input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<{ conversationId: string }> => {
    try {
      const sql = await getSql();
      const uid = context.userId;
      await touchProfile(sql, uid);
      const other = data.otherUserId;
      if (other !== uid) {
        const found = await sql<{ id: string }>`select "id" as id from "user" where "id" = ${other}`;
        if (!found[0]) throw new Error("User not found");
        await sql`
          insert into cc_profiles (user_id, display_name, email, image_url, last_seen)
          select "id", "name", "email", "image", "createdAt"
          from "user"
          where "id" = ${other}
          on conflict (user_id) do nothing
        `;
      }
      const low = uid < other ? uid : other;
      const high = uid < other ? other : uid;
      const id = crypto.randomUUID();
      const rows = await sql<{ id: string }>`
        insert into cc_conversations (id, low_id, high_id)
        values (${id}, ${low}, ${high})
        on conflict (low_id, high_id) do update
          set updated_at = cc_conversations.updated_at
        returning id
      `;
      return { conversationId: rows[0].id };
    } catch (error) {
      friendly(error);
    }
  });
