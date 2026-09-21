import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { isOwnerManager } from "@/lib/authz";
import { paymentMethodLabel } from "@/lib/payments";
import VoidPaymentButton from "./VoidPaymentButton";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const session = await requireSession();
  const canVoid = isOwnerManager(session);

  const payments = await prisma.payment.findMany({
    orderBy: { date: "desc" },
    take: 200,
    include: { applications: { include: { invoice: true } } },
  });

  const th = "px-3 py-2 text-left font-medium text-xs uppercase tracking-wide";

  return (
    <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
      <p className="mb-3">
        <Link href="/" className="text-sm" style={{ color: "var(--faint)" }}>&larr; Home</Link>
      </p>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <div>
          <div className="eyebrow mb-1">Accounts Receivable</div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>
            Payments Register ({payments.length})
          </h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/api/payments/export" className="btn">Export CSV</Link>
          <Link href="/payments/new" className="btn btn-primary">+ Record Payment</Link>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: "var(--paper)" }}>
              <th className={th} style={{ color: "var(--faint)" }}>Date</th>
              <th className={th} style={{ color: "var(--faint)" }}>Customer</th>
              <th className={th} style={{ color: "var(--faint)" }}>Method</th>
              <th className={th} style={{ color: "var(--faint)" }}>Applied To</th>
              <th className={`${th} text-right`} style={{ color: "var(--faint)" }}>Amount</th>
              <th className={`${th} text-right`} style={{ color: "var(--faint)" }}>Unapplied</th>
              <th className={th} style={{ color: "var(--faint)" }}>Status</th>
              {canVoid && <th className={th}></th>}
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} style={p.voided ? { opacity: 0.5 } : undefined}>
                <td className="px-3 py-2 border-t hairline" style={{ color: "var(--faint)" }}>{new Date(p.date).toLocaleDateString()}</td>
                <td className="px-3 py-2 border-t hairline font-medium">{p.customerName}</td>
                <td className="px-3 py-2 border-t hairline">
                  {paymentMethodLabel(p.method, p.checkNumber)}
                  {p.creditSourceLabel ? ` (${p.creditSourceLabel})` : ""}
                </td>
                <td className="px-3 py-2 border-t hairline mono" style={{ color: "var(--faint)" }}>
                  {p.applications.length > 0 ? p.applications.map((a) => `#${a.invoice.number}`).join(", ") : "—"}
                </td>
                <td className="px-3 py-2 border-t hairline text-right mono font-medium">${Number(p.amount).toFixed(2)}</td>
                <td className="px-3 py-2 border-t hairline text-right mono" style={{ color: "var(--faint)" }}>
                  {Number(p.unapplied) > 0.005 ? `$${Number(p.unapplied).toFixed(2)}` : "—"}
                </td>
                <td className="px-3 py-2 border-t hairline">{p.voided ? "Voided" : p.atSale ? "At Sale" : "—"}</td>
                {canVoid && <td className="px-3 py-2 border-t hairline">{!p.voided && <VoidPaymentButton paymentId={p.id} />}</td>}
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td className="px-3 py-8 text-center text-sm border-t hairline" colSpan={canVoid ? 8 : 7} style={{ color: "var(--faint)" }}>
                  No payments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
