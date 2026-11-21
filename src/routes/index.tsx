import { createFileRoute } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { ChatScreen } from "@/components/chat/chat-screen";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <BootScreen />;
  if (!user) return <RedirectToSignIn />;
  return <ChatScreen />;
}

function BootScreen() {
  return (
    <main className="grid h-dvh place-items-center bg-bg text-fg">
      <div className="flex flex-col items-center gap-3">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-xl font-bold text-accent-ink">
          C
        </span>
        <p className="text-sm text-muted">Opening CloudChat…</p>
      </div>
    </main>
  );
}
