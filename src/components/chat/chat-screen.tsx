import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  MessageCircle,
  Moon,
  Plus,
  Search,
  Send,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import { UserButton } from "@/lib/auth/gates";
import {
  deleteMessage,
  inbox,
  openChat,
  searchUsers,
  sendMessage,
  setTyping,
  thread,
  type ChatMessage,
  type Conversation,
  type Person,
} from "@/lib/chat/server";

type PendingMessage = ChatMessage & { pending?: boolean };

function formatClock(ts: number) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(ts);
}

function dayKey(ts: number) {
  const date = new Date(ts);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatDay(ts: number) {
  const date = new Date(ts);
  const today = new Date();
  const start = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const diff = start(today) - start(date);
  if (diff === 0) return "Today";
  if (diff === 86_400_000) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  }).format(date);
}

function formatListTime(ts: number | null) {
  if (!ts) return "";
  const label = formatDay(ts);
  if (label === "Today") return formatClock(ts);
  if (label === "Yesterday") return "Yesterday";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(ts);
}

function presence(online: boolean, lastSeen: number, self: boolean) {
  if (self) return "Notes only you can see";
  if (online) return "online";
  if (!lastSeen) return "offline";
  const day = formatDay(lastSeen);
  if (day === "Today") return `last seen today at ${formatClock(lastSeen)}`;
  if (day === "Yesterday") return `last seen yesterday`;
  return `last seen ${day}`;
}

function Avatar({
  name,
  imageUrl,
  online,
  large = false,
}: {
  name: string;
  imageUrl: string | null;
  online?: boolean;
  large?: boolean;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const size = large ? "h-11 w-11" : "h-10 w-10";
  return (
    <span className="relative inline-flex shrink-0">
      {imageUrl ? (
        <img src={imageUrl} alt="" className={`${size} rounded-full object-cover`} />
      ) : (
        <span className={`${size} grid place-items-center rounded-full bg-accent text-sm font-semibold text-accent-ink`}>
          {initial}
        </span>
      )}
      {online ? (
        <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-panel bg-accent" />
      ) : null}
    </span>
  );
}

function Ticks({ status }: { status: ChatMessage["status"] }) {
  if (status === "sent") return <Check className="h-3.5 w-3.5 text-muted" aria-label="Sent" />;
  return (
    <CheckCheck
      className={status === "read" ? "h-3.5 w-3.5 text-tick" : "h-3.5 w-3.5 text-muted"}
      aria-label={status === "read" ? "Read" : "Delivered"}
    />
  );
}

export function ChatScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [ready, setReady] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PendingMessage[]>([]);
  const [peerTyping, setPeerTyping] = useState(false);
  const [filter, setFilter] = useState("");
  const [composing, setComposing] = useState(false);
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [directory, setDirectory] = useState<Person[]>([]);
  const [searching, setSearching] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [dark, setDark] = useState(true);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<number | null>(null);
  const activeRef = useRef<string | null>(null);
  activeRef.current = activeId;

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
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
    void tick();
    const id = window.setInterval(() => void tick(), 2500);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
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
          const pending = prev.filter((item) => item.pending);
          const stillPending = pending.filter(
            (item) =>
              !result.messages.some(
                (server) => server.body === item.body && Math.abs(server.createdAt - item.createdAt) < 20000,
              ),
          );
          return [...result.messages, ...stillPending];
        });
        setBanner(null);
      } catch (error) {
        if (stop) return;
        setBanner(error instanceof Error ? error.message : "Couldn’t load messages.");
      }
    }
    void tick();
    const id = window.setInterval(() => void tick(), 1200);
    return () => {
      stop = true;
      window.clearInterval(id);
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
      void setTyping({ data: { conversationId: current, active: false } }).catch(() => undefined);
    };
  }, [activeId]);

  useEffect(() => {
    if (!stickRef.current) return;
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, peerTyping, activeId]);

  useEffect(() => {
    const query = directoryQuery.trim();
    if (!composing || query.length < 1) {
      setDirectory([]);
      return;
    }
    let stop = false;
    setSearching(true);
    const id = window.setTimeout(() => {
      void searchUsers({ data: { query } })
        .then((people) => {
          if (!stop) setDirectory(people);
        })
        .catch((error: unknown) => {
          if (!stop) setBanner(error instanceof Error ? error.message : "Search failed.");
        })
        .finally(() => {
          if (!stop) setSearching(false);
        });
    }, 250);
    return () => {
      stop = true;
      window.clearTimeout(id);
    };
  }, [directoryQuery, composing]);

  const active = conversations.find((item) => item.id === activeId) ?? null;
  const visibleChats = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((item) =>
      `${item.title} ${item.preview} ${item.email ?? ""}`.toLowerCase().includes(query),
    );
  }, [conversations, filter]);

  function toggleTheme() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("cloudchat-theme", next ? "dark" : "light");
    setDark(next);
  }

  async function startChat(otherUserId: string) {
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

  function notifyTyping(text: string, conversationId: string) {
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    if (text.trim()) {
      void setTyping({ data: { conversationId, active: true } }).catch(() => undefined);
      typingTimer.current = window.setTimeout(() => {
        void setTyping({ data: { conversationId, active: false } }).catch(() => undefined);
      }, 1600);
    } else {
      void setTyping({ data: { conversationId, active: false } }).catch(() => undefined);
    }
  }

  async function onSend() {
    if (!activeId || sending) return;
    const body = draft.trim();
    if (!body) return;
    const tempId = crypto.randomUUID();
    const optimistic: PendingMessage = {
      id: tempId,
      conversationId: activeId,
      senderId: "me",
      body,
      status: "sent",
      deletedEveryone: false,
      createdAt: Date.now(),
      pending: true,
    };
    setDraft("");
    setSending(true);
    stickRef.current = true;
    setMessages((prev) => [...prev, optimistic]);
    notifyTyping("", activeId);
    try {
      const saved = await sendMessage({ data: { conversationId: activeId, body } });
      setMessages((prev) => prev.map((item) => (item.id === tempId ? saved : item)));
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

  async function onDelete(message: PendingMessage, scope: "me" | "everyone") {
    setMenuId(null);
    if (message.pending) return;
    setMessages((prev) =>
      scope === "me"
        ? prev.filter((item) => item.id !== message.id)
        : prev.map((item) =>
            item.id === message.id ? { ...item, deletedEveryone: true, body: "" } : item,
          ),
    );
    try {
      await deleteMessage({ data: { messageId: message.id, scope } });
    } catch (error) {
      setBanner(error instanceof Error ? error.message : "Couldn’t delete that message.");
    }
  }

  const showThread = Boolean(activeId);

  return (
    <div className="flex h-dvh bg-bg text-fg">
      <aside
        className={`${showThread ? "hidden md:flex" : "flex"} w-full min-w-0 flex-col border-line bg-panel md:w-96 md:border-r`}
      >
        <header className="flex items-center gap-3 border-b border-line px-4 py-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent text-accent-ink">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold tracking-tight">CloudChat</p>
            <p className="truncate text-xs text-muted">Private messages</p>
          </div>
          <button
            type="button"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={toggleTheme}
            className="grid h-11 w-11 place-items-center rounded-full hover:bg-panel-2"
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button
            type="button"
            aria-label="New chat"
            onClick={() => setComposing(true)}
            className="grid h-11 w-11 place-items-center rounded-full hover:bg-panel-2"
          >
            <Plus className="h-5 w-5" />
          </button>
        </header>

        {banner ? (
          <p className="mx-3 mt-3 rounded-xl bg-panel-2 px-3 py-2 text-sm text-danger" role="alert">
            {banner}
          </p>
        ) : null}

        {composing ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center gap-2 px-3 py-3">
              <button
                type="button"
                aria-label="Close new chat"
                onClick={() => setComposing(false)}
                className="grid h-11 w-11 place-items-center rounded-full hover:bg-panel-2"
              >
                <X className="h-5 w-5" />
              </button>
              <input
                autoFocus
                value={directoryQuery}
                onChange={(event) => setDirectoryQuery(event.target.value)}
                placeholder="Search people by name or email"
                className="h-11 min-w-0 flex-1 rounded-full bg-panel-2 px-4 text-sm outline-none"
              />
            </div>
            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  const self = conversations.find((item) => item.self);
                  if (self) {
                    setActiveId(self.id);
                    setComposing(false);
                  }
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-panel-2"
              >
                <Avatar name="You" imageUrl={null} />
                <span>
                  <span className="block text-sm font-semibold">Message yourself</span>
                  <span className="block text-xs text-muted">A private notepad inside CloudChat</span>
                </span>
              </button>
              {searching ? <p className="px-4 py-3 text-sm text-muted">Searching…</p> : null}
              {!searching && directoryQuery.trim() && directory.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted">No one matches that. They need a CloudChat account.</p>
              ) : null}
              {directory.map((person) => (
                <button
                  key={person.userId}
                  type="button"
                  onClick={() => void startChat(person.userId)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-panel-2"
                >
                  <Avatar name={person.displayName} imageUrl={person.imageUrl} online={person.online} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{person.displayName}</span>
                    <span className="block truncate text-xs text-muted">
                      {person.online ? "online" : person.email}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="px-3 py-3">
              <label className="flex h-11 items-center gap-2 rounded-full bg-panel-2 px-4">
                <Search className="h-4 w-4 text-muted" />
                <input
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  placeholder="Search chats"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </label>
            </div>
            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
              {!ready
                ? Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-3 px-4 py-3">
                      <span className="h-10 w-10 animate-pulse rounded-full bg-panel-2" />
                      <span className="flex-1 space-y-2">
                        <span className="block h-3 w-32 animate-pulse rounded bg-panel-2" />
                        <span className="block h-3 w-48 animate-pulse rounded bg-panel-2" />
                      </span>
                    </div>
                  ))
                : null}
              {ready && visibleChats.length === 0 ? (
                <p className="px-4 py-8 text-sm text-muted">No chats yet. Start one with the plus button.</p>
              ) : null}
              {visibleChats.map((chat) => {
                const selected = chat.id === activeId;
                return (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => {
                      setActiveId(chat.id);
                      setMenuId(null);
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left ${selected ? "bg-panel-2" : "hover:bg-panel-2"}`}
                  >
                    <Avatar
                      name={chat.self ? "You" : chat.title}
                      imageUrl={chat.imageUrl}
                      online={chat.online && !chat.self}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{chat.title}</span>
                        <span className="shrink-0 text-xs text-muted">{formatListTime(chat.previewAt)}</span>
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span className={`truncate text-xs ${chat.typing ? "text-accent" : "text-muted"}`}>
                          {chat.typing ? "typing…" : chat.preview}
                        </span>
                        {chat.unread > 0 ? (
                          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-xs font-semibold text-accent-ink">
                            {chat.unread}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <footer className="border-t border-line px-4 py-3">
              <UserButton />
            </footer>
          </>
        )}
      </aside>

      <section className={`${showThread ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
        {active ? (
          <>
            <header className="flex items-center gap-2 border-b border-line bg-header px-2 py-2 md:px-4">
              <button
                type="button"
                aria-label="Back to chats"
                onClick={() => setActiveId(null)}
                className="grid h-11 w-11 place-items-center rounded-full hover:bg-panel md:hidden"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Avatar
                name={active.self ? "You" : active.title}
                imageUrl={active.imageUrl}
                online={active.online && !active.self}
                large
              />
              <div className="min-w-0">
                <p className="truncate font-semibold">{active.title}</p>
                <p className={`truncate text-xs ${peerTyping || active.typing ? "text-accent" : "text-muted"}`}>
                  {peerTyping || active.typing ? "typing…" : presence(active.online, active.lastSeen, active.self)}
                </p>
              </div>
            </header>
            <div
              ref={scrollerRef}
              onScroll={() => {
                const node = scrollerRef.current;
                if (!node) return;
                stickRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
              }}
              className="chat-canvas scroll-thin min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-8"
            >
              <div className="mx-auto flex max-w-3xl flex-col gap-1">
                {messages.length === 0 ? (
                  <p className="mx-auto mt-8 rounded-xl bg-panel px-4 py-2 text-center text-xs text-muted shadow-sm">
                    {active.self
                      ? "This space is just for you. Notes you send stay on your account."
                      : "Say hello. Messages stay in this chat."}
                  </p>
                ) : null}
                {messages.map((message, index) => {
                  const mine = message.pending || active.self || message.senderId !== active.otherId;
                  const previous = messages[index - 1];
                  const showDay = index === 0 || !previous || dayKey(message.createdAt) !== dayKey(previous.createdAt);
                  return (
                    <div key={message.id}>
                      {showDay ? (
                        <p className="mx-auto my-3 w-fit rounded-lg bg-panel px-3 py-1 text-xs text-muted shadow-sm">
                          {formatDay(message.createdAt)}
                        </p>
                      ) : null}
                      <div className={`group flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`relative max-w-xs rounded-lg px-3 py-1.5 shadow-sm sm:max-w-sm ${
                            mine ? "rounded-tr-none bg-bubble-out" : "rounded-tl-none bg-bubble-in"
                          }`}
                        >
                          {message.deletedEveryone ? (
                            <p className="py-1 text-sm text-muted italic">This message was deleted</p>
                          ) : (
                            <p className="pr-10 text-sm break-words whitespace-pre-wrap">{message.body}</p>
                          )}
                          <span className="mt-0.5 flex items-center justify-end gap-1 text-xs text-muted">
                            <time dateTime={new Date(message.createdAt).toISOString()}>
                              {formatClock(message.createdAt)}
                            </time>
                            {mine && !message.deletedEveryone ? <Ticks status={message.status} /> : null}
                          </span>
                          {!message.deletedEveryone && !message.pending ? (
                            <button
                              type="button"
                              aria-label="Message actions"
                              onClick={() => setMenuId(menuId === message.id ? null : message.id)}
                              className="absolute top-1 right-1 grid h-8 w-8 place-items-center rounded-full text-muted opacity-100 hover:bg-bg md:opacity-0 md:group-hover:opacity-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                          {menuId === message.id ? (
                            <div className="absolute top-8 right-0 z-10 w-48 overflow-hidden rounded-xl border border-line bg-panel text-sm shadow-lg">
                              <button
                                type="button"
                                onClick={() => void onDelete(message, "me")}
                                className="block w-full px-3 py-3 text-left hover:bg-panel-2"
                              >
                                Delete for me
                              </button>
                              {mine ? (
                                <button
                                  type="button"
                                  onClick={() => void onDelete(message, "everyone")}
                                  className="block w-full px-3 py-3 text-left text-danger hover:bg-panel-2"
                                >
                                  Delete for everyone
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {peerTyping ? <p className="w-fit rounded-lg bg-bubble-in px-3 py-2 text-sm text-muted">typing…</p> : null}
              </div>
            </div>
            <form
              className="flex items-end gap-2 bg-header px-3 py-3"
              onSubmit={(event) => {
                event.preventDefault();
                void onSend();
              }}
            >
              <textarea
                ref={composerRef}
                value={draft}
                rows={1}
                placeholder="Type a message"
                onChange={(event) => {
                  setDraft(event.target.value);
                  if (activeId) notifyTyping(event.target.value, activeId);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void onSend();
                  }
                }}
                className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl bg-panel px-4 py-3 text-sm outline-none"
              />
              <button
                type="submit"
                disabled={sending || draft.trim().length === 0}
                aria-label="Send message"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-accent-ink disabled:opacity-40"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </>
        ) : (
          <div className="chat-canvas grid flex-1 place-items-center px-6 text-center">
            <div className="max-w-sm">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-panel text-accent shadow-sm">
                <MessageCircle className="h-8 w-8" />
              </span>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight">CloudChat</h1>
              <p className="mt-2 text-sm text-muted">
                Pick a conversation, or message yourself while you wait for someone else to join.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
