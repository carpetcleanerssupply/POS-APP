import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import VoidReturnButton from "./VoidReturnButton";

const th = { textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "2px solid #ddd", fontSize: "0.85rem" };
const td = { padding: "0.5rem 0.75rem", borderBottom: "1px solid #eee" };

export const dynamic = "force-dynamic";

export default async function ReturnsPage() {
  await requireSession();
  const returns = await prisma.return.findMany({ orderBy: { number: "desc" }, take: 200, include: { originalInvoice: true } });

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 900 }}>
      <p><Link href="/">&larr; Home</Link></p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Returns</h1>
        <Link href="/returns/new" style={{ padding: "0.55rem 1rem", background: "#1a1a1a", color: "#fff", borderRadius: 6, textDecoration: "none" }}>
          + Process Return
        </Link>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
        <thead>
          <tr>
            <th style={th}>#</th>
            <th style={th}>Date</th>
            <th style={th}>Customer</th>
            <th style={th}>Against Invoice</th>
            <th style={th}>Refund</th>
            <th style={{ ...th, textAlign: "right" }}>Total</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {returns.map((r) => (
            <tr key={r.id} style={r.voided ? { opacity: 0.5 } : undefined}>
              <td style={td}>{r.number}</td>
              <td style={td}>{new Date(r.date).toLocaleDateString()}</td>
              <td style={td}>{r.customerName}</td>
              <td style={td}><Link href={`/invoices/${r.originalInvoiceId}`}>#{r.originalInvoice?.number}</Link></td>
              <td style={td}>{r.refundMethod === "ACCOUNT" ? "Account Credit" : r.refundMethod}</td>
              <td style={{ ...td, textAlign: "right" }}>${Number(r.total).toFixed(2)}</td>
              <td style={td}>{r.voided ? "Voided" : <VoidReturnButton returnId={r.id} />}</td>
            </tr>
          ))}
          {returns.length === 0 && (
            <tr>
              <td style={td} colSpan={7}>No returns yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
