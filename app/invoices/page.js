import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

const th = { textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "2px solid #ddd", fontSize: "0.85rem" };
const td = { padding: "0.5rem 0.75rem", borderBottom: "1px solid #eee" };

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  await requireSession();

  const invoices = await prisma.invoice.findMany({
    orderBy: { number: "desc" },
    take: 100,
  });

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 900 }}>
      <p><a href="/">&larr; Home</a></p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Invoices</h1>
        <a href="/invoices/new" style={{ padding: "0.55rem 1rem", background: "#1a1a1a", color: "#fff", borderRadius: 6, textDecoration: "none" }}>
          + New Invoice
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
          {invoices.map((inv) => (
            <tr key={inv.id}>
              <td style={td}><a href={`/invoices/${inv.id}`}>{inv.number}</a></td>
              <td style={td}>{new Date(inv.date).toLocaleDateString()}</td>
              <td style={td}>{inv.customerName}</td>
              <td style={td}>{inv.settledTo === "ACCOUNT" ? "Charged" : "Paid"}</td>
              <td style={{ ...td, textAlign: "right" }}>${Number(inv.total).toFixed(2)}</td>
            </tr>
          ))}
          {invoices.length === 0 && (
            <tr>
              <td style={td} colSpan={5}>No invoices yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
