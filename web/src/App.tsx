import { FormEvent, useEffect, useState } from "react";
import "./App.css";

type PublicUser = {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
};

type Mode = "login" | "register";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Request failed");
  }
  return data;
}

export default function App() {
  const [mode, setMode] = useState<Mode>("login");
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    request<{ user: PublicUser }>("/api/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const path = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const body =
        mode === "register"
          ? { fullName, email, password }
          : { email, password };
      const data = await request<{ user: PublicUser }>(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setUser(data.user);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function onLogout() {
    setSubmitting(true);
    setError(null);
    try {
      await request("/api/auth/logout", { method: "POST" });
      setUser(null);
      setMode("login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logout failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="shell">
        <p>Checking session…</p>
      </main>
    );
  }

  if (user) {
    return (
      <main className="shell">
        <section className="card">
          <p className="eyebrow">Signed in</p>
          <h1>{user.fullName}</h1>
          <dl>
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>User ID</dt>
              <dd>{user.id}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{new Date(user.createdAt).toLocaleString()}</dd>
            </div>
          </dl>
          {error ? <p className="error">{error}</p> : null}
          <button type="button" onClick={onLogout} disabled={submitting}>
            {submitting ? "Signing out…" : "Sign out"}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <section className="card">
        <p className="eyebrow">Gym project</p>
        <h1>{mode === "login" ? "Sign in" : "Create account"}</h1>
        <p className="lede">
          Test the auth layer against Postgres sessions stored in Prisma.
        </p>
        <div className="tabs">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => setMode("register")}
          >
            Register
          </button>
        </div>
        <form onSubmit={onSubmit}>
          {mode === "register" ? (
            <label>
              Full name
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                autoComplete="name"
                required
              />
            </label>
          ) : null}
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              minLength={8}
              required
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button type="submit" disabled={submitting}>
            {submitting
              ? "Working…"
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}
