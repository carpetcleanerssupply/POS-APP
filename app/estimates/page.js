import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

const th = { textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "2px solid #ddd", fontSize: "0.85rem" };
const td = { padding: "0.5rem 0.75rem", borderBottom: "1px solid #eee" };

export const dynamic = "force-dynamic";

export default async function EstimatesPage() {
  await requireSession();
  const estimates = await prisma.estimate.findMany({ orderBy: { number: "desc" }, take: 200 });

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 900 }}>
      <p><a href="/">&larr; Home</a></p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Estimates</h1>
        <a href="/estimates/new" style={{ padding: "0.55rem 1rem", background: "#1a1a1a", color: "#fff", borderRadius: 6, textDecoration: "none" }}>
          + New Estimate
        </a>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
        <thead>
          <tr>
            <th style={th}>#</th>
            <th style={th}>Date</th>
            <th style={th}>Customer</th>
            <th style={th}>Status</th>
            <th style={{ ...th, textAlign: "right" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {estimates.map((e) => (
            <tr key={e.id}>
              <td style={td}><a href={`/estimates/${e.id}`}>{e.number}</a></td>
              <td style={td}>{new Date(e.date).toLocaleDateString()}</td>
              <td style={td}>{e.customerName}</td>
              <td style={td}>{e.status === "CONVERTED" ? "Converted" : "Open"}</td>
              <td style={{ ...td, textAlign: "right" }}>${Number(e.total).toFixed(2)}</td>
            </tr>
          ))}
          {estimates.length === 0 && (
            <tr>
              <td style={td} colSpan={5}>No estimates yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
