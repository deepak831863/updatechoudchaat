import { i as TSS_SERVER_FUNCTION, r as createServerFn } from "./ssr.mjs";
import { A as boolean, B as ZodError, D as _enum, F as object, R as string } from "../_libs/@better-auth/core+[...].mjs";
import { r as getSql } from "./db-DJNPPxUq.mjs";
import { t as authMiddleware } from "./middleware-DGCnIpaC.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/server-CkjlxgLk.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
function num(value) {
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
function asBool(value) {
	return value === true || value === "t" || value === "true" || value === 1;
}
function parseInput(schema, input) {
	const result = schema.safeParse(input);
	if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Invalid input");
	return result.data;
}
function likePattern(query) {
	return `%${query.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}
function friendly(error) {
	if (error instanceof ZodError) throw new Error(error.issues[0]?.message ?? "Check that and try again.");
	if (error instanceof Error && error.message && error.message.length < 180 && !/sql|relation|syntax|password authentication/i.test(error.message)) throw error;
	console.error(error);
	throw new Error("Something went wrong. Try again.");
}
async function touchProfile(sql, userId) {
	if (!(await sql`
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
  `)[0]) throw new Error("Sign in required");
	await sql`
    insert into cc_conversations (id, low_id, high_id)
    values (${crypto.randomUUID()}, ${userId}, ${userId})
    on conflict (low_id, high_id) do nothing
  `;
}
async function loadConversation(sql, userId, conversationId) {
	return (await sql`
    select id, low_id, high_id
    from cc_conversations
    where id = ${conversationId}
      and (low_id = ${userId} or high_id = ${userId})
  `)[0] ?? null;
}
function mapMessage(row) {
	const deleted = asBool(row.deleted_everyone);
	const status = row.status === "read" || row.status === "delivered" ? row.status : "sent";
	return {
		id: row.id,
		conversationId: row.conversation_id,
		senderId: row.sender_id,
		body: deleted ? "" : row.body,
		status,
		deletedEveryone: deleted,
		createdAt: num(row.created_at)
	};
}
var inbox_createServerFn_handler = createServerRpc({
	id: "2aa03f837235c4bb79d964cedfa5db69a00b7cdaeee17af8d0f8a71b877dafef",
	name: "inbox",
	filename: "src/lib/chat/server.ts"
}, (opts) => inbox.__executeServer(opts));
var inbox = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(inbox_createServerFn_handler, async ({ context }) => {
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
		return (await sql`
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
      `).map((row) => {
			const self = row.other_id === uid;
			const deleted = asBool(row.last_deleted);
			const hasLast = row.last_body !== null || deleted;
			let preview = "No messages yet";
			if (hasLast && deleted) preview = "This message was deleted";
			else if (row.last_body) preview = row.last_sender === uid ? `You: ${row.last_body}` : row.last_body;
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
				updatedAt: num(row.updated_at)
			};
		});
	} catch (error) {
		friendly(error);
	}
});
var threadInput = object({ conversationId: string().uuid() });
var thread_createServerFn_handler = createServerRpc({
	id: "1e5d625385bedaf38c1165530f8335ebd68720d2caf7aac6a74917962f210482",
	name: "thread",
	filename: "src/lib/chat/server.ts"
}, (opts) => thread.__executeServer(opts));
var thread = createServerFn({ method: "POST" }).validator((input) => parseInput(threadInput, input)).middleware([authMiddleware]).handler(thread_createServerFn_handler, async ({ context, data }) => {
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
		const rows = await sql`
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
		const typingRows = await sql`
        select (until_at > now()) as typing
        from cc_typing
        where conversation_id = ${convo.id} and user_id <> ${uid}
        limit 1
      `;
		return {
			messages: rows.map(mapMessage),
			typing: asBool(typingRows[0]?.typing)
		};
	} catch (error) {
		friendly(error);
	}
});
var sendInput = object({
	conversationId: string().uuid(),
	body: string().trim().min(1, "Message is empty").max(4e3, "Message is too long")
});
var sendMessage_createServerFn_handler = createServerRpc({
	id: "047c6e12e0661ccbb9a545e016d75c08c12357cab6956fc5e97dc469c272b61e",
	name: "sendMessage",
	filename: "src/lib/chat/server.ts"
}, (opts) => sendMessage.__executeServer(opts));
var sendMessage = createServerFn({ method: "POST" }).validator((input) => parseInput(sendInput, input)).middleware([authMiddleware]).handler(sendMessage_createServerFn_handler, async ({ context, data }) => {
	try {
		const sql = await getSql();
		const uid = context.userId;
		await touchProfile(sql, uid);
		const convo = await loadConversation(sql, uid, data.conversationId);
		if (!convo) throw new Error("Conversation not found");
		const peer = convo.low_id === uid ? convo.high_id : convo.low_id;
		let status = "sent";
		if (peer === uid) status = "read";
		else if (asBool((await sql`
          select (last_seen > now() - interval '35 seconds') as online
          from cc_profiles
          where user_id = ${peer}
        `)[0]?.online)) status = "delivered";
		const rows = await sql`
        insert into cc_messages (id, conversation_id, sender_id, body, status)
        values (${crypto.randomUUID()}, ${convo.id}, ${uid}, ${data.body}, ${status})
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
var deleteInput = object({
	messageId: string().uuid(),
	scope: _enum(["me", "everyone"])
});
var deleteMessage_createServerFn_handler = createServerRpc({
	id: "b292a107005152f222d6bb81cdcd9b90841426d26cb9b243389f516a4da50328",
	name: "deleteMessage",
	filename: "src/lib/chat/server.ts"
}, (opts) => deleteMessage.__executeServer(opts));
var deleteMessage = createServerFn({ method: "POST" }).validator((input) => parseInput(deleteInput, input)).middleware([authMiddleware]).handler(deleteMessage_createServerFn_handler, async ({ context, data }) => {
	try {
		const sql = await getSql();
		const uid = context.userId;
		const message = (await sql`
        select m.id, m.sender_id, m.conversation_id
        from cc_messages m
        join cc_conversations c on c.id = m.conversation_id
        where m.id = ${data.messageId}
          and (c.low_id = ${uid} or c.high_id = ${uid})
      `)[0];
		if (!message) throw new Error("Message not found");
		if (data.scope === "everyone") {
			if (message.sender_id !== uid) throw new Error("Only the sender can delete for everyone");
			await sql`
          update cc_messages
          set deleted_everyone = true, body = ''
          where id = ${message.id}
        `;
		} else await sql`
          insert into cc_hides (message_id, user_id)
          values (${message.id}, ${uid})
          on conflict do nothing
        `;
		return { ok: true };
	} catch (error) {
		friendly(error);
	}
});
var typingInput = object({
	conversationId: string().uuid(),
	active: boolean()
});
var setTyping_createServerFn_handler = createServerRpc({
	id: "7dd9e21c1c95b5d6cfd57f2b737b8f24a45e70b2100625b189e4a752eea71712",
	name: "setTyping",
	filename: "src/lib/chat/server.ts"
}, (opts) => setTyping.__executeServer(opts));
var setTyping = createServerFn({ method: "POST" }).validator((input) => parseInput(typingInput, input)).middleware([authMiddleware]).handler(setTyping_createServerFn_handler, async ({ context, data }) => {
	try {
		const sql = await getSql();
		const uid = context.userId;
		const convo = await loadConversation(sql, uid, data.conversationId);
		if (!convo) throw new Error("Conversation not found");
		if (!data.active || convo.low_id === convo.high_id) await sql`delete from cc_typing where conversation_id = ${convo.id} and user_id = ${uid}`;
		else await sql`
          insert into cc_typing (conversation_id, user_id, until_at)
          values (${convo.id}, ${uid}, now() + interval '3 seconds')
          on conflict (conversation_id, user_id)
          do update set until_at = excluded.until_at
        `;
		return { ok: true };
	} catch (error) {
		friendly(error);
	}
});
var searchInput = object({ query: string().trim().min(1).max(80) });
var searchUsers_createServerFn_handler = createServerRpc({
	id: "818a077769d6ede2b131c6d7290919b1666cc6cc965aeb2403f332deb7c5b5b6",
	name: "searchUsers",
	filename: "src/lib/chat/server.ts"
}, (opts) => searchUsers.__executeServer(opts));
var searchUsers = createServerFn({ method: "POST" }).validator((input) => parseInput(searchInput, input)).middleware([authMiddleware]).handler(searchUsers_createServerFn_handler, async ({ context, data }) => {
	try {
		const sql = await getSql();
		const uid = context.userId;
		await touchProfile(sql, uid);
		const pattern = likePattern(data.query);
		return (await sql`
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
      `).map((row) => ({
			userId: row.user_id,
			displayName: row.display_name,
			email: row.email,
			imageUrl: row.image_url,
			online: asBool(row.online),
			lastSeen: num(row.last_seen)
		}));
	} catch (error) {
		friendly(error);
	}
});
var openInput = object({ otherUserId: string().trim().min(1).max(200) });
var openChat_createServerFn_handler = createServerRpc({
	id: "31b746b6d3dd9f44c851441e5c54288c31eae7a27c35f2c89443eb11f09dbe4f",
	name: "openChat",
	filename: "src/lib/chat/server.ts"
}, (opts) => openChat.__executeServer(opts));
var openChat = createServerFn({ method: "POST" }).validator((input) => parseInput(openInput, input)).middleware([authMiddleware]).handler(openChat_createServerFn_handler, async ({ context, data }) => {
	try {
		const sql = await getSql();
		const uid = context.userId;
		await touchProfile(sql, uid);
		const other = data.otherUserId;
		if (other !== uid) {
			if (!(await sql`select "id" as id from "user" where "id" = ${other}`)[0]) throw new Error("User not found");
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
		return { conversationId: (await sql`
        insert into cc_conversations (id, low_id, high_id)
        values (${crypto.randomUUID()}, ${low}, ${high})
        on conflict (low_id, high_id) do update
          set updated_at = cc_conversations.updated_at
        returning id
      `)[0].id };
	} catch (error) {
		friendly(error);
	}
});
//#endregion
export { deleteMessage_createServerFn_handler, inbox_createServerFn_handler, openChat_createServerFn_handler, searchUsers_createServerFn_handler, sendMessage_createServerFn_handler, setTyping_createServerFn_handler, thread_createServerFn_handler };
