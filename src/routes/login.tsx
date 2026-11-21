import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MessageCircle, ShieldCheck, Wifi } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { updatePhoneNumber } from "@/lib/chat/server";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({ component: LoginPage });

function normalizePhone(value: string): string {
  return value.replace(/[^\d+]/g, "");
}

function LoginPage() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isPending) {
    return <main className="grid h-dvh place-items-center bg-bg text-muted">Opening CloudChat…</main>;
  }
  if (user) return <RedirectToSignIn to="/" />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const cleanUsername = username.trim().toLowerCase();
    const cleanPhone = cleanUsername.replace(/[^\d+]/g, "");
    if (mode === "signup" && !/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
      setError("Username must contain 3–30 letters, numbers, or underscores.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (mode === "signup") {
      if (name.trim().length < 1) {
        setError("Enter your name.");
        return;
      }
      if (!email.trim().includes("@")) {
        setError("Enter a valid Gmail or email address.");
        return;
      }
    }
    if (mode === "signup" && phoneNumber.trim()) {
      const phone = normalizePhone(phoneNumber);
      if (!/^\+?[0-9]{7,15}$/.test(phone)) {
        setError("Enter a valid phone number, or leave it blank.");
        return;
      }
    }

    setBusy(true);
    try {
      const result = mode === "signup"
        ? await authClient.signUp.email({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
            username: cleanUsername,
          })
        : cleanUsername.includes("@")
          ? await authClient.signIn.email({ email: cleanUsername, password })
          : /^\+?[0-9]{7,15}$/.test(cleanPhone)
            ? await authClient.signIn.phoneNumber({ phoneNumber: cleanPhone, password })
            : await authClient.signIn.username({ username: cleanUsername, password });
      if (result.error) {
        setError(result.error.message || "Could not continue.");
        setBusy(false);
        return;
      }
      if (mode === "signup" && phoneNumber.trim()) {
        await updatePhoneNumber({
          data: { phoneNumber: normalizePhone(phoneNumber) },
        });
      }
      await authClient.getSession();
      await navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not continue.");
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
            Private conversations, directly to the people you choose.
          </h1>
          <ul className="space-y-4 text-sm text-muted">
            <li className="flex items-start gap-3"><Wifi className="mt-0.5 h-4 w-4 text-accent" />Live chats and typing indicators.</li>
            <li className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 text-accent" />Username and phone-based account discovery.</li>
            <li className="flex items-start gap-3"><MessageCircle className="mt-0.5 h-4 w-4 text-accent" />Find someone by username, user ID, or phone number.</li>
          </ul>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold tracking-tight">
            {mode === "signin" ? "Sign in" : "Create account"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {mode === "signin"
              ? "Use Gmail, username, or mobile number."
              : "Create a direct account — no OTP or verification."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-3">
            {mode === "signup" ? (
              <label className="block text-sm">
                <span className="mb-1 block text-muted">Name</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  maxLength={80}
                  required
                  className="w-full rounded-xl border border-line bg-panel px-3 py-3 outline-none"
                />
              </label>
            ) : null}
            {mode === "signup" ? (
              <label className="block text-sm">
                <span className="mb-1 block text-muted">Gmail or email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="name@gmail.com"
                  required
                  className="w-full rounded-xl border border-line bg-panel px-3 py-3 outline-none"
                />
              </label>
            ) : null}
            <label className="block text-sm">
              <span className="mb-1 block text-muted">
                {mode === "signin" ? "Gmail, username, or mobile number" : "Username"}
              </span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                maxLength={30}
                required
                className="w-full rounded-xl border border-line bg-panel px-3 py-3 outline-none"
              />
            </label>
            {mode === "signup" ? (
              <label className="block text-sm">
                <span className="mb-1 block text-muted">Phone number (optional)</span>
                <input
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  autoComplete="tel"
                  placeholder="+1234567890"
                  className="w-full rounded-xl border border-line bg-panel px-3 py-3 outline-none"
                />
              </label>
            ) : null}
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
            {error ? <p className="rounded-xl bg-panel-2 px-3 py-2 text-sm text-danger" role="alert">{error}</p> : null}
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
            className="mt-4 text-sm text-accent"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
            }}
          >
            {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
        </div>
      </section>
    </main>
  );
}
