import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  await requireSession();

  const invoices = await prisma.invoice.findMany({
    orderBy: { number: "desc" },
    take: 100,
  });

  const th = "px-3 py-2 text-left font-medium text-xs uppercase tracking-wide";

  return (
    <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
      <p className="mb-3">
        <Link href="/" className="text-sm" style={{ color: "var(--faint)" }}>&larr; Home</Link>
      </p>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <div>
          <div className="eyebrow mb-1">Invoice Register</div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>
            Invoices ({invoices.length})
          </h1>
        </div>
        <Link href="/invoices/new" className="btn btn-primary">+ New Invoice</Link>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: "var(--paper)" }}>
              <th className={th} style={{ color: "var(--faint)" }}>#</th>
              <th className={th} style={{ color: "var(--faint)" }}>Date</th>
              <th className={th} style={{ color: "var(--faint)" }}>Customer</th>
              <th className={th} style={{ color: "var(--faint)" }}>Status</th>
              <th className={`${th} text-right`} style={{ color: "var(--faint)" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td className="px-3 py-2 border-t hairline">
                  <Link href={`/invoices/${inv.id}`} className="font-medium mono" style={{ color: "var(--deep)" }}>{inv.number}</Link>
                </td>
                <td className="px-3 py-2 border-t hairline" style={{ color: "var(--faint)" }}>{new Date(inv.date).toLocaleDateString()}</td>
                <td className="px-3 py-2 border-t hairline">{inv.customerName}</td>
                <td className="px-3 py-2 border-t hairline">{inv.status === "DRAFT" ? "Draft" : inv.settledTo === "ACCOUNT" ? "Charged" : "Paid"}</td>
                <td className="px-3 py-2 border-t hairline text-right mono font-medium">${Number(inv.total).toFixed(2)}</td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td className="px-3 py-8 text-center text-sm border-t hairline" colSpan={5} style={{ color: "var(--faint)" }}>
                  No invoices yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
