const ERROR_MESSAGES = {
  missing: "Enter a username and password.",
  invalid: "Incorrect username or password.",
};

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const error = ERROR_MESSAGES[params?.error] ?? null;

  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        padding: "3rem 1.5rem",
        maxWidth: 380,
        margin: "4rem auto 0",
      }}
    >
      <h1 style={{ fontSize: "1.5rem" }}>Carpet Cleaners Supply</h1>
      <p style={{ color: "#555", marginTop: "0.25rem" }}>Sign in to the POS</p>

      {error && (
        <p
          style={{
            color: "#c62828",
            background: "#ffebee",
            padding: "0.75rem 1rem",
            borderRadius: 8,
            marginTop: "1.25rem",
          }}
        >
          {error}
        </p>
      )}

      <form
        action="/api/auth/login"
        method="POST"
        style={{ display: "flex", flexDirection: "column", gap: "0.9rem", marginTop: "1.5rem" }}
      >
        <label>
          Username
          <input
            name="username"
            type="text"
            required
            autoFocus
            autoComplete="username"
            style={{ display: "block", width: "100%", padding: "0.55rem", marginTop: "0.25rem" }}
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            style={{ display: "block", width: "100%", padding: "0.55rem", marginTop: "0.25rem" }}
          />
        </label>
        <button
          type="submit"
          style={{ padding: "0.65rem", marginTop: "0.5rem", cursor: "pointer" }}
        >
          Sign in
        </button>
      </form>
    </main>
  );
}
