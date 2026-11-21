import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MessageCircle, ShieldCheck, Wifi } from "lucide-react";
import { GROK_PROVIDERS, authClient, signIn } from "@/lib/auth/client";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({ component: LoginPage });

function rememberPreviewToken(token: string | null | undefined) {
  if (!token || typeof window === "undefined") return;
  if (!window.location.hostname.endsWith(".grok-sandbox.com")) return;
  try {
    window.sessionStorage.setItem("grok-auth.bearer-token", token);
  } catch {
    /* ignore */
  }
}

function LoginPage() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isPending) {
    return <main className="grid h-dvh place-items-center bg-bg text-muted">Opening CloudChat…</main>;
  }
  if (user) return <RedirectToSignIn to="/" />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail.includes("@")) {
      setError("Enter a valid email.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (mode === "signup" && name.trim().length < 1) {
      setError("Add your name so people can find you.");
      return;
    }
    setBusy(true);
    try {
      const result =
        mode === "signup"
          ? await authClient.signUp.email({
              name: name.trim(),
              email: trimmedEmail,
              password,
            })
          : await authClient.signIn.email({
              email: trimmedEmail,
              password,
            });
      if (result.error) {
        setError(result.error.message || "Could not sign in.");
        setBusy(false);
        return;
      }
      rememberPreviewToken(result.data?.token);
      await authClient.getSession();
      await navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setBusy(false);
    }
  }

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
          <h2 className="text-2xl font-semibold tracking-tight">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {mode === "signin" ? "Sign in to pick up your chats." : "A name, an email, and you’re in."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            {mode === "signup" ? (
              <label className="block text-sm">
                <span className="mb-1 block text-muted">Name</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  maxLength={80}
                  className="w-full rounded-xl border border-line bg-panel px-3 py-3 outline-none"
                />
              </label>
            ) : null}
            <label className="block text-sm">
              <span className="mb-1 block text-muted">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                className="w-full rounded-xl border border-line bg-panel px-3 py-3 outline-none"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                minLength={8}
                required
                className="w-full rounded-xl border border-line bg-panel px-3 py-3 outline-none"
              />
            </label>
            {error ? (
              <p className="rounded-xl bg-panel-2 px-3 py-2 text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-ink disabled:opacity-60"
            >
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            type="button"
            className="mt-3 text-sm text-accent"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
            }}
          >
            {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>

          <div className="my-6 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>

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
