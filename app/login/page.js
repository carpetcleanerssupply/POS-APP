import Image from "next/image";

const ERROR_MESSAGES = {
  missing: "Enter a username and password.",
  invalid: "Incorrect username or password.",
  locked: "Too many failed attempts. This login is temporarily locked — try again in 15 minutes.",
};

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const error = ERROR_MESSAGES[params?.error] ?? null;

  return (
    <main className="p-6" style={{ maxWidth: 380, margin: "4rem auto 0" }}>
      <div className="card p-6">
        <Image src="/logo.jpg" alt="Carpet Cleaners Supply" width={1200} height={308} style={{ width: "100%", maxWidth: 260, height: "auto" }} priority />
        <p className="text-sm mt-1" style={{ color: "var(--faint)" }}>Sign in to the POS</p>

        {error && (
          <p className="mt-4 px-4 py-3 rounded-lg text-sm" style={{ color: "var(--rust)", backgroundColor: "var(--rust-bg)" }}>
            {error}
          </p>
        )}

        <form action="/api/auth/login" method="POST" className="flex flex-col gap-3 mt-5">
          <div>
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Username</div>
            <input
              name="username"
              type="text"
              required
              autoFocus
              autoComplete="username"
              className="w-full px-3 py-2 rounded border text-sm focus-amber hairline"
              style={{ backgroundColor: "var(--panel)" }}
            />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Password</div>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full px-3 py-2 rounded border text-sm focus-amber hairline"
              style={{ backgroundColor: "var(--panel)" }}
            />
          </div>
          <button type="submit" className="btn btn-primary mt-2">Sign in</button>
        </form>
      </div>
    </main>
  );
}
