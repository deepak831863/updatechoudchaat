import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, ShieldCheck, Wifi } from "lucide-react";
import { GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { user, isPending } = useCurrentUserState();

  if (isPending) {
    return <main className="grid h-dvh place-items-center bg-bg text-muted">Opening CloudChat…</main>;
  }
  if (user) return <RedirectToSignIn to="/" />;

  return (
    <main className="grid min-h-dvh bg-bg text-fg md:grid-cols-2">
      <section className="hidden flex-col justify-between bg-panel px-12 py-12 md:flex">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent text-accent-ink">
            <MessageCircle className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">CloudChat</span>
        </div>
        <div className="max-w-md space-y-6">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Messages that feel like they landed in the room.
          </h1>
          <ul className="space-y-4 text-sm text-muted">
            <li className="flex items-start gap-3">
              <Wifi className="mt-0.5 h-4 w-4 text-accent" />
              Live sending, typing, and online status.
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-accent" />
              Sent, delivered, and read — kept in your history.
            </li>
            <li className="flex items-start gap-3">
              <MessageCircle className="mt-0.5 h-4 w-4 text-accent" />
              One-to-one chats, including a private note to yourself.
            </li>
          </ul>
        </div>
        <p className="text-xs text-muted">Private by account. Dark by default.</p>
      </section>

      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 md:hidden">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent text-accent-ink">
              <MessageCircle className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold">CloudChat</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Welcome to CloudChat</h2>
          <p className="mt-1 text-sm text-muted">Sign in with your Google account.</p>
          <div className="space-y-2">
            {GROK_PROVIDERS.map((provider) => (
              <button
                key={provider.providerId}
                type="button"
                onClick={() => signIn(provider.providerId, { callbackURL: "/" })}
                className="w-full rounded-xl border border-line bg-panel px-4 py-3 text-sm font-medium hover:bg-panel-2"
              >
                Continue with {provider.label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
