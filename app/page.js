import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

// Live database status on every request, not baked in at build time.
export const dynamic = "force-dynamic";

async function checkDatabase() {
  try {
    const userCount = await prisma.user.count();
    return { connected: true, userCount };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

export default async function Home() {
  const session = await requireSession();
  const db = await checkDatabase();

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 640 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1>Carpet Cleaners Supply — POS</h1>
          <p>
            Signed in as <strong>{session.user.name}</strong>{" "}
            ({session.user.tier === "OWNER_MANAGER" ? "Owner/Manager" : "Staff"})
          </p>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button type="submit" style={{ padding: "0.5rem 0.9rem", cursor: "pointer" }}>
            Sign out
          </button>
        </form>
      </div>
      <p>Pipeline check: code → Vercel → live database.</p>

      <nav style={{ margin: "1rem 0", display: "flex", gap: "1rem" }}>
        <a href="/items">Items</a>
        <a href="/customers">Customers</a>
        <a href="/invoices">Invoices</a>
        <a href="/estimates">Estimates</a>
        <a href="/payments">Payments</a>
        <a href="/returns">Returns</a>
      </nav>

      <div
        style={{
          marginTop: "1.5rem",
          padding: "1rem 1.25rem",
          borderRadius: 8,
          border: "1px solid",
          borderColor: db.connected ? "#2e7d32" : "#c62828",
          background: db.connected ? "#e8f5e9" : "#ffebee",
        }}
      >
        {db.connected ? (
          <>
            <strong>Database connected.</strong>
            <p style={{ margin: "0.5rem 0 0" }}>
              Users table has {db.userCount} row{db.userCount === 1 ? "" : "s"}.
            </p>
          </>
        ) : (
          <>
            <strong>Database not connected yet.</strong>
            <p style={{ margin: "0.5rem 0 0" }}>
              This is expected until a Postgres database is connected in Vercel
              and its connection details are set as environment variables.
            </p>
            <pre
              style={{
                marginTop: "0.75rem",
                whiteSpace: "pre-wrap",
                fontSize: "0.85rem",
                opacity: 0.8,
              }}
            >
              {db.error}
            </pre>
          </>
        )}
      </div>
    </main>
  );
}
