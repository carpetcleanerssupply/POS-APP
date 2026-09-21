import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import VoidReturnButton from "./VoidReturnButton";

export const dynamic = "force-dynamic";

export default async function ReturnsPage() {
  await requireSession();
  const returns = await prisma.return.findMany({ orderBy: { number: "desc" }, take: 200, include: { originalInvoice: true } });

  const th = "px-3 py-2 text-left font-medium text-xs uppercase tracking-wide";

  return (
    <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
      <p className="mb-3">
        <Link href="/" className="text-sm" style={{ color: "var(--faint)" }}>&larr; Home</Link>
      </p>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <div>
          <div className="eyebrow mb-1">Returns Register</div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>
            Returns ({returns.length})
          </h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/api/returns/export" className="btn">Export CSV</Link>
          <Link href="/returns/new" className="btn btn-primary">+ Process Return</Link>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: "var(--paper)" }}>
              <th className={th} style={{ color: "var(--faint)" }}>#</th>
              <th className={th} style={{ color: "var(--faint)" }}>Date</th>
              <th className={th} style={{ color: "var(--faint)" }}>Customer</th>
              <th className={th} style={{ color: "var(--faint)" }}>Against Invoice</th>
              <th className={th} style={{ color: "var(--faint)" }}>Refund</th>
              <th className={`${th} text-right`} style={{ color: "var(--faint)" }}>Total</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {returns.map((r) => (
              <tr key={r.id} style={r.voided ? { opacity: 0.5 } : undefined}>
                <td className="px-3 py-2 border-t hairline mono">{r.number}</td>
                <td className="px-3 py-2 border-t hairline" style={{ color: "var(--faint)" }}>{new Date(r.date).toLocaleDateString()}</td>
                <td className="px-3 py-2 border-t hairline">{r.customerName}</td>
                <td className="px-3 py-2 border-t hairline">
                  <Link href={`/invoices/${r.originalInvoiceId}`} className="mono" style={{ color: "var(--deep)" }}>#{r.originalInvoice?.number}</Link>
                </td>
                <td className="px-3 py-2 border-t hairline">{r.refundMethod === "ACCOUNT" ? "Account Credit" : r.refundMethod}</td>
                <td className="px-3 py-2 border-t hairline text-right mono font-medium">${Number(r.total).toFixed(2)}</td>
                <td className="px-3 py-2 border-t hairline">{r.voided ? "Voided" : <VoidReturnButton returnId={r.id} />}</td>
              </tr>
            ))}
            {returns.length === 0 && (
              <tr>
                <td className="px-3 py-8 text-center text-sm border-t hairline" colSpan={7} style={{ color: "var(--faint)" }}>
                  No returns yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
