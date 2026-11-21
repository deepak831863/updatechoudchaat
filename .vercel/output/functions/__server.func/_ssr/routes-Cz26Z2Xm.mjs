import { o as __toESM } from "../_runtime.mjs";
import { S as require_jsx_runtime, Y as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as getServerFnById, i as TSS_SERVER_FUNCTION, r as createServerFn } from "./ssr.mjs";
import { A as boolean, D as _enum, F as object, R as string } from "../_libs/@better-auth/core+[...].mjs";
import { n as UserButton, r as useCurrentUserState, t as RedirectToSignIn } from "./gates-DFtl4hgV.mjs";
import { a as Sun, c as Search, d as MessageCircle, f as Check, i as Trash2, l as Plus, m as ArrowLeft, p as CheckCheck, s as Send, t as X, u as Moon } from "../_libs/lucide-react.mjs";
import { t as authMiddleware } from "./middleware-DGCnIpaC.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-Cz26Z2Xm.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
function parseInput(schema, input) {
	const result = schema.safeParse(input);
	if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Invalid input");
	return result.data;
}
var inbox = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("2aa03f837235c4bb79d964cedfa5db69a00b7cdaeee17af8d0f8a71b877dafef"));
var threadInput = object({ conversationId: string().uuid() });
var thread = createServerFn({ method: "POST" }).validator((input) => parseInput(threadInput, input)).middleware([authMiddleware]).handler(createSsrRpc("1e5d625385bedaf38c1165530f8335ebd68720d2caf7aac6a74917962f210482"));
var sendInput = object({
	conversationId: string().uuid(),
	body: string().trim().min(1, "Message is empty").max(4e3, "Message is too long")
});
var sendMessage = createServerFn({ method: "POST" }).validator((input) => parseInput(sendInput, input)).middleware([authMiddleware]).handler(createSsrRpc("047c6e12e0661ccbb9a545e016d75c08c12357cab6956fc5e97dc469c272b61e"));
var deleteInput = object({
	messageId: string().uuid(),
	scope: _enum(["me", "everyone"])
});
var deleteMessage = createServerFn({ method: "POST" }).validator((input) => parseInput(deleteInput, input)).middleware([authMiddleware]).handler(createSsrRpc("b292a107005152f222d6bb81cdcd9b90841426d26cb9b243389f516a4da50328"));
var typingInput = object({
	conversationId: string().uuid(),
	active: boolean()
});
var setTyping = createServerFn({ method: "POST" }).validator((input) => parseInput(typingInput, input)).middleware([authMiddleware]).handler(createSsrRpc("7dd9e21c1c95b5d6cfd57f2b737b8f24a45e70b2100625b189e4a752eea71712"));
var searchInput = object({ query: string().trim().min(1).max(80) });
var searchUsers = createServerFn({ method: "POST" }).validator((input) => parseInput(searchInput, input)).middleware([authMiddleware]).handler(createSsrRpc("818a077769d6ede2b131c6d7290919b1666cc6cc965aeb2403f332deb7c5b5b6"));
var openInput = object({ otherUserId: string().trim().min(1).max(200) });
var openChat = createServerFn({ method: "POST" }).validator((input) => parseInput(openInput, input)).middleware([authMiddleware]).handler(createSsrRpc("31b746b6d3dd9f44c851441e5c54288c31eae7a27c35f2c89443eb11f09dbe4f"));
function formatClock(ts) {
	return new Intl.DateTimeFormat(void 0, {
		hour: "numeric",
		minute: "2-digit"
	}).format(ts);
}
function dayKey(ts) {
	const date = new Date(ts);
	return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
function formatDay(ts) {
	const date = new Date(ts);
	const today = /* @__PURE__ */ new Date();
	const start = (value) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
	const diff = start(today) - start(date);
	if (diff === 0) return "Today";
	if (diff === 864e5) return "Yesterday";
	return new Intl.DateTimeFormat(void 0, {
		month: "short",
		day: "numeric",
		year: date.getFullYear() === today.getFullYear() ? void 0 : "numeric"
	}).format(date);
}
function formatListTime(ts) {
	if (!ts) return "";
	const label = formatDay(ts);
	if (label === "Today") return formatClock(ts);
	if (label === "Yesterday") return "Yesterday";
	return new Intl.DateTimeFormat(void 0, {
		month: "short",
		day: "numeric"
	}).format(ts);
}
function presence(online, lastSeen, self) {
	if (self) return "Notes only you can see";
	if (online) return "online";
	if (!lastSeen) return "offline";
	const day = formatDay(lastSeen);
	if (day === "Today") return `last seen today at ${formatClock(lastSeen)}`;
	if (day === "Yesterday") return `last seen yesterday`;
	return `last seen ${day}`;
}
function Avatar({ name, imageUrl, online, large = false }) {
	const initial = name.trim().charAt(0).toUpperCase() || "?";
	const size = large ? "h-11 w-11" : "h-10 w-10";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "relative inline-flex shrink-0",
		children: [imageUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: imageUrl,
			alt: "",
			className: `${size} rounded-full object-cover`
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: `${size} grid place-items-center rounded-full bg-accent text-sm font-semibold text-accent-ink`,
			children: initial
		}), online ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-panel bg-accent" }) : null]
	});
}
function Ticks({ status }) {
	if (status === "sent") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
		className: "h-3.5 w-3.5 text-muted",
		"aria-label": "Sent"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckCheck, {
		className: status === "read" ? "h-3.5 w-3.5 text-tick" : "h-3.5 w-3.5 text-muted",
		"aria-label": status === "read" ? "Read" : "Delivered"
	});
}
function ChatScreen() {
	const [conversations, setConversations] = (0, import_react.useState)([]);
	const [ready, setReady] = (0, import_react.useState)(false);
	const [banner, setBanner] = (0, import_react.useState)(null);
	const [activeId, setActiveId] = (0, import_react.useState)(null);
	const [messages, setMessages] = (0, import_react.useState)([]);
	const [peerTyping, setPeerTyping] = (0, import_react.useState)(false);
	const [filter, setFilter] = (0, import_react.useState)("");
	const [composing, setComposing] = (0, import_react.useState)(false);
	const [directoryQuery, setDirectoryQuery] = (0, import_react.useState)("");
	const [directory, setDirectory] = (0, import_react.useState)([]);
	const [searching, setSearching] = (0, import_react.useState)(false);
	const [draft, setDraft] = (0, import_react.useState)("");
	const [sending, setSending] = (0, import_react.useState)(false);
	const [menuId, setMenuId] = (0, import_react.useState)(null);
	const [dark, setDark] = (0, import_react.useState)(true);
	const scrollerRef = (0, import_react.useRef)(null);
	const stickRef = (0, import_react.useRef)(true);
	const composerRef = (0, import_react.useRef)(null);
	const typingTimer = (0, import_react.useRef)(null);
	const activeRef = (0, import_react.useRef)(null);
	activeRef.current = activeId;
	(0, import_react.useEffect)(() => {
		setDark(document.documentElement.classList.contains("dark"));
	}, []);
	(0, import_react.useEffect)(() => {
		let stop = false;
		async function tick() {
			try {
				const rows = await inbox();
				if (stop) return;
				setConversations(rows);
				setReady(true);
				setBanner(null);
			} catch (error) {
				if (stop) return;
				setBanner(error instanceof Error ? error.message : "Couldn’t refresh chats.");
			}
		}
		tick();
		const id = window.setInterval(() => void tick(), 2500);
		return () => {
			stop = true;
			window.clearInterval(id);
		};
	}, []);
	(0, import_react.useEffect)(() => {
		if (!activeId) return;
		let stop = false;
		const current = activeId;
		stickRef.current = true;
		async function tick() {
			try {
				const result = await thread({ data: { conversationId: current } });
				if (stop || activeRef.current !== current) return;
				setPeerTyping(result.typing);
				setMessages((prev) => {
					const stillPending = prev.filter((item) => item.pending).filter((item) => !result.messages.some((server) => server.body === item.body && Math.abs(server.createdAt - item.createdAt) < 2e4));
					return [...result.messages, ...stillPending];
				});
				setBanner(null);
			} catch (error) {
				if (stop) return;
				setBanner(error instanceof Error ? error.message : "Couldn’t load messages.");
			}
		}
		tick();
		const id = window.setInterval(() => void tick(), 1200);
		return () => {
			stop = true;
			window.clearInterval(id);
			if (typingTimer.current) window.clearTimeout(typingTimer.current);
			setTyping({ data: {
				conversationId: current,
				active: false
			} }).catch(() => void 0);
		};
	}, [activeId]);
	(0, import_react.useEffect)(() => {
		if (!stickRef.current) return;
		const node = scrollerRef.current;
		if (!node) return;
		node.scrollTop = node.scrollHeight;
	}, [
		messages,
		peerTyping,
		activeId
	]);
	(0, import_react.useEffect)(() => {
		const query = directoryQuery.trim();
		if (!composing || query.length < 1) {
			setDirectory([]);
			return;
		}
		let stop = false;
		setSearching(true);
		const id = window.setTimeout(() => {
			searchUsers({ data: { query } }).then((people) => {
				if (!stop) setDirectory(people);
			}).catch((error) => {
				if (!stop) setBanner(error instanceof Error ? error.message : "Search failed.");
			}).finally(() => {
				if (!stop) setSearching(false);
			});
		}, 250);
		return () => {
			stop = true;
			window.clearTimeout(id);
		};
	}, [directoryQuery, composing]);
	const active = conversations.find((item) => item.id === activeId) ?? null;
	const visibleChats = (0, import_react.useMemo)(() => {
		const query = filter.trim().toLowerCase();
		if (!query) return conversations;
		return conversations.filter((item) => `${item.title} ${item.preview} ${item.email ?? ""}`.toLowerCase().includes(query));
	}, [conversations, filter]);
	function toggleTheme() {
		const next = !document.documentElement.classList.contains("dark");
		document.documentElement.classList.toggle("dark", next);
		localStorage.setItem("cloudchat-theme", next ? "dark" : "light");
		setDark(next);
	}
	async function startChat(otherUserId) {
		try {
			const { conversationId } = await openChat({ data: { otherUserId } });
			setComposing(false);
			setDirectoryQuery("");
			setActiveId(conversationId);
			const rows = await inbox();
			setConversations(rows);
			composerRef.current?.focus();
		} catch (error) {
			setBanner(error instanceof Error ? error.message : "Couldn’t open that chat.");
		}
	}
	function notifyTyping(text, conversationId) {
		if (typingTimer.current) window.clearTimeout(typingTimer.current);
		if (text.trim()) {
			setTyping({ data: {
				conversationId,
				active: true
			} }).catch(() => void 0);
			typingTimer.current = window.setTimeout(() => {
				setTyping({ data: {
					conversationId,
					active: false
				} }).catch(() => void 0);
			}, 1600);
		} else setTyping({ data: {
			conversationId,
			active: false
		} }).catch(() => void 0);
	}
	async function onSend() {
		if (!activeId || sending) return;
		const body = draft.trim();
		if (!body) return;
		const tempId = crypto.randomUUID();
		const optimistic = {
			id: tempId,
			conversationId: activeId,
			senderId: "me",
			body,
			status: "sent",
			deletedEveryone: false,
			createdAt: Date.now(),
			pending: true
		};
		setDraft("");
		setSending(true);
		stickRef.current = true;
		setMessages((prev) => [...prev, optimistic]);
		notifyTyping("", activeId);
		try {
			const saved = await sendMessage({ data: {
				conversationId: activeId,
				body
			} });
			setMessages((prev) => prev.map((item) => item.id === tempId ? saved : item));
			const rows = await inbox();
			setConversations(rows);
		} catch (error) {
			setMessages((prev) => prev.filter((item) => item.id !== tempId));
			setDraft(body);
			setBanner(error instanceof Error ? error.message : "Message didn’t send.");
		} finally {
			setSending(false);
			composerRef.current?.focus();
		}
	}
	async function onDelete(message, scope) {
		setMenuId(null);
		if (message.pending) return;
		setMessages((prev) => scope === "me" ? prev.filter((item) => item.id !== message.id) : prev.map((item) => item.id === message.id ? {
			...item,
			deletedEveryone: true,
			body: ""
		} : item));
		try {
			await deleteMessage({ data: {
				messageId: message.id,
				scope
			} });
		} catch (error) {
			setBanner(error instanceof Error ? error.message : "Couldn’t delete that message.");
		}
	}
	const showThread = Boolean(activeId);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-dvh bg-bg text-fg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: `${showThread ? "hidden md:flex" : "flex"} w-full min-w-0 flex-col border-line bg-panel md:w-96 md:border-r`,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "flex items-center gap-3 border-b border-line px-4 py-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "grid h-10 w-10 place-items-center rounded-2xl bg-accent text-accent-ink",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, { className: "h-5 w-5" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "truncate text-base font-semibold tracking-tight",
								children: "CloudChat"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "truncate text-xs text-muted",
								children: "Private messages"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": dark ? "Switch to light mode" : "Switch to dark mode",
							onClick: toggleTheme,
							className: "grid h-11 w-11 place-items-center rounded-full hover:bg-panel-2",
							children: dark ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sun, { className: "h-5 w-5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Moon, { className: "h-5 w-5" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": "New chat",
							onClick: () => setComposing(true),
							className: "grid h-11 w-11 place-items-center rounded-full hover:bg-panel-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-5 w-5" })
						})
					]
				}),
				banner ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mx-3 mt-3 rounded-xl bg-panel-2 px-3 py-2 text-sm text-danger",
					role: "alert",
					children: banner
				}) : null,
				composing ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex min-h-0 flex-1 flex-col",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 px-3 py-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": "Close new chat",
							onClick: () => setComposing(false),
							className: "grid h-11 w-11 place-items-center rounded-full hover:bg-panel-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-5 w-5" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							autoFocus: true,
							value: directoryQuery,
							onChange: (event) => setDirectoryQuery(event.target.value),
							placeholder: "Search people by name or email",
							className: "h-11 min-w-0 flex-1 rounded-full bg-panel-2 px-4 text-sm outline-none"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "scroll-thin min-h-0 flex-1 overflow-y-auto",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => {
									const self = conversations.find((item) => item.self);
									if (self) {
										setActiveId(self.id);
										setComposing(false);
									}
								},
								className: "flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-panel-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
									name: "You",
									imageUrl: null
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block text-sm font-semibold",
									children: "Message yourself"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block text-xs text-muted",
									children: "A private notepad inside CloudChat"
								})] })]
							}),
							searching ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "px-4 py-3 text-sm text-muted",
								children: "Searching…"
							}) : null,
							!searching && directoryQuery.trim() && directory.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "px-4 py-6 text-sm text-muted",
								children: "No one matches that. They need a CloudChat account."
							}) : null,
							directory.map((person) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => void startChat(person.userId),
								className: "flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-panel-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
									name: person.displayName,
									imageUrl: person.imageUrl,
									online: person.online
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "block truncate text-sm font-semibold",
										children: person.displayName
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "block truncate text-xs text-muted",
										children: person.online ? "online" : person.email
									})]
								})]
							}, person.userId))
						]
					})]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "px-3 py-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex h-11 items-center gap-2 rounded-full bg-panel-2 px-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "h-4 w-4 text-muted" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: filter,
								onChange: (event) => setFilter(event.target.value),
								placeholder: "Search chats",
								className: "min-w-0 flex-1 bg-transparent text-sm outline-none"
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "scroll-thin min-h-0 flex-1 overflow-y-auto",
						children: [
							!ready ? Array.from({ length: 6 }).map((_, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3 px-4 py-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-10 w-10 animate-pulse rounded-full bg-panel-2" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex-1 space-y-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "block h-3 w-32 animate-pulse rounded bg-panel-2" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "block h-3 w-48 animate-pulse rounded bg-panel-2" })]
								})]
							}, index)) : null,
							ready && visibleChats.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "px-4 py-8 text-sm text-muted",
								children: "No chats yet. Start one with the plus button."
							}) : null,
							visibleChats.map((chat) => {
								const selected = chat.id === activeId;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => {
										setActiveId(chat.id);
										setMenuId(null);
									},
									className: `flex w-full items-center gap-3 px-4 py-3 text-left ${selected ? "bg-panel-2" : "hover:bg-panel-2"}`,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
										name: chat.self ? "You" : chat.title,
										imageUrl: chat.imageUrl,
										online: chat.online && !chat.self
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "min-w-0 flex-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "flex items-baseline justify-between gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "truncate text-sm font-semibold",
												children: chat.title
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "shrink-0 text-xs text-muted",
												children: formatListTime(chat.previewAt)
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "mt-0.5 flex items-center justify-between gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: `truncate text-xs ${chat.typing ? "text-accent" : "text-muted"}`,
												children: chat.typing ? "typing…" : chat.preview
											}), chat.unread > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-xs font-semibold text-accent-ink",
												children: chat.unread
											}) : null]
										})]
									})]
								}, chat.id);
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("footer", {
						className: "border-t border-line px-4 py-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserButton, {})
					})
				] })
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			className: `${showThread ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`,
			children: active ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "flex items-center gap-2 border-b border-line bg-header px-2 py-2 md:px-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": "Back to chats",
							onClick: () => setActiveId(null),
							className: "grid h-11 w-11 place-items-center rounded-full hover:bg-panel md:hidden",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "h-5 w-5" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
							name: active.self ? "You" : active.title,
							imageUrl: active.imageUrl,
							online: active.online && !active.self,
							large: true
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "truncate font-semibold",
								children: active.title
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: `truncate text-xs ${peerTyping || active.typing ? "text-accent" : "text-muted"}`,
								children: peerTyping || active.typing ? "typing…" : presence(active.online, active.lastSeen, active.self)
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					ref: scrollerRef,
					onScroll: () => {
						const node = scrollerRef.current;
						if (!node) return;
						stickRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
					},
					className: "chat-canvas scroll-thin min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-8",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mx-auto flex max-w-3xl flex-col gap-1",
						children: [
							messages.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mx-auto mt-8 rounded-xl bg-panel px-4 py-2 text-center text-xs text-muted shadow-sm",
								children: active.self ? "This space is just for you. Notes you send stay on your account." : "Say hello. Messages stay in this chat."
							}) : null,
							messages.map((message, index) => {
								const mine = message.pending || active.self || message.senderId !== active.otherId;
								const previous = messages[index - 1];
								const showDay = index === 0 || !previous || dayKey(message.createdAt) !== dayKey(previous.createdAt);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [showDay ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mx-auto my-3 w-fit rounded-lg bg-panel px-3 py-1 text-xs text-muted shadow-sm",
									children: formatDay(message.createdAt)
								}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: `group flex ${mine ? "justify-end" : "justify-start"}`,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: `relative max-w-xs rounded-lg px-3 py-1.5 shadow-sm sm:max-w-sm ${mine ? "rounded-tr-none bg-bubble-out" : "rounded-tl-none bg-bubble-in"}`,
										children: [
											message.deletedEveryone ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "py-1 text-sm text-muted italic",
												children: "This message was deleted"
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "pr-10 text-sm break-words whitespace-pre-wrap",
												children: message.body
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "mt-0.5 flex items-center justify-end gap-1 text-xs text-muted",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("time", {
													dateTime: new Date(message.createdAt).toISOString(),
													children: formatClock(message.createdAt)
												}), mine && !message.deletedEveryone ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ticks, { status: message.status }) : null]
											}),
											!message.deletedEveryone && !message.pending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												"aria-label": "Message actions",
												onClick: () => setMenuId(menuId === message.id ? null : message.id),
												className: "absolute top-1 right-1 grid h-8 w-8 place-items-center rounded-full text-muted opacity-100 hover:bg-bg md:opacity-0 md:group-hover:opacity-100",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3.5 w-3.5" })
											}) : null,
											menuId === message.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "absolute top-8 right-0 z-10 w-48 overflow-hidden rounded-xl border border-line bg-panel text-sm shadow-lg",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													onClick: () => void onDelete(message, "me"),
													className: "block w-full px-3 py-3 text-left hover:bg-panel-2",
													children: "Delete for me"
												}), mine ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													onClick: () => void onDelete(message, "everyone"),
													className: "block w-full px-3 py-3 text-left text-danger hover:bg-panel-2",
													children: "Delete for everyone"
												}) : null]
											}) : null
										]
									})
								})] }, message.id);
							}),
							peerTyping ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "w-fit rounded-lg bg-bubble-in px-3 py-2 text-sm text-muted",
								children: "typing…"
							}) : null
						]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "flex items-end gap-2 bg-header px-3 py-3",
					onSubmit: (event) => {
						event.preventDefault();
						onSend();
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						ref: composerRef,
						value: draft,
						rows: 1,
						placeholder: "Type a message",
						onChange: (event) => {
							setDraft(event.target.value);
							if (activeId) notifyTyping(event.target.value, activeId);
						},
						onKeyDown: (event) => {
							if (event.key === "Enter" && !event.shiftKey) {
								event.preventDefault();
								onSend();
							}
						},
						className: "max-h-32 min-h-11 flex-1 resize-none rounded-2xl bg-panel px-4 py-3 text-sm outline-none"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "submit",
						disabled: sending || draft.trim().length === 0,
						"aria-label": "Send message",
						className: "grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-accent-ink disabled:opacity-40",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "h-5 w-5" })
					})]
				})
			] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "chat-canvas grid flex-1 place-items-center px-6 text-center",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "max-w-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-panel text-accent shadow-sm",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, { className: "h-8 w-8" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "mt-4 text-2xl font-semibold tracking-tight",
							children: "CloudChat"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-muted",
							children: "Pick a conversation, or message yourself while you wait for someone else to join."
						})
					]
				})
			})
		})]
	});
}
function Home() {
	const { user, isPending } = useCurrentUserState();
	if (isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BootScreen, {});
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RedirectToSignIn, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatScreen, {});
}
function BootScreen() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "grid h-dvh place-items-center bg-bg text-fg",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-col items-center gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "grid h-14 w-14 place-items-center rounded-2xl bg-accent text-xl font-bold text-accent-ink",
				children: "C"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Opening CloudChat…"
			})]
		})
	});
}
//#endregion
export { Home as component };
