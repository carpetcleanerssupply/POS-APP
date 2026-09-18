import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { isOwnerManager } from "@/lib/authz";
import { paymentMethodLabel } from "@/lib/payments";
import VoidPaymentButton from "./VoidPaymentButton";

const th = { textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "2px solid #ddd", fontSize: "0.85rem" };
const td = { padding: "0.5rem 0.75rem", borderBottom: "1px solid #eee" };

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const session = await requireSession();
  const canVoid = isOwnerManager(session);

  const payments = await prisma.payment.findMany({
    orderBy: { date: "desc" },
    take: 200,
    include: { applications: { include: { invoice: true } } },
  });

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 900 }}>
      <p><Link href="/">&larr; Home</Link></p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Payments Register</h1>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <Link href="/api/payments/export">Export CSV</Link>
          <Link href="/payments/new" style={{ padding: "0.55rem 1rem", background: "#1e3a5f", color: "#fff", borderRadius: 6, textDecoration: "none" }}>
            + Record Payment
          </Link>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
        <thead>
          <tr>
            <th style={th}>Date</th>
            <th style={th}>Customer</th>
            <th style={th}>Method</th>
            <th style={th}>Applied To</th>
            <th style={{ ...th, textAlign: "right" }}>Amount</th>
            <th style={{ ...th, textAlign: "right" }}>Unapplied</th>
            <th style={th}>Status</th>
            {canVoid && <th style={th}></th>}
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} style={p.voided ? { opacity: 0.5 } : undefined}>
              <td style={td}>{new Date(p.date).toLocaleDateString()}</td>
              <td style={td}>{p.customerName}</td>
              <td style={td}>{paymentMethodLabel(p.method, p.checkNumber)}{p.creditSourceLabel ? ` (${p.creditSourceLabel})` : ""}</td>
              <td style={td}>
                {p.applications.length > 0
                  ? p.applications.map((a) => `#${a.invoice.number}`).join(", ")
                  : "—"}
              </td>
              <td style={{ ...td, textAlign: "right" }}>${Number(p.amount).toFixed(2)}</td>
              <td style={{ ...td, textAlign: "right" }}>{Number(p.unapplied) > 0.005 ? `$${Number(p.unapplied).toFixed(2)}` : "—"}</td>
              <td style={td}>{p.voided ? "Voided" : p.atSale ? "At Sale" : "—"}</td>
              {canVoid && <td style={td}>{!p.voided && <VoidPaymentButton paymentId={p.id} />}</td>}
            </tr>
          ))}
          {payments.length === 0 && (
            <tr>
              <td style={td} colSpan={canVoid ? 8 : 7}>No payments yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
