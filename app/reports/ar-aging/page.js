import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { isOwnerManager } from "@/lib/authz";
import { buildArAging } from "@/lib/reports";

export const dynamic = "force-dynamic";

export default async function ARAgingPage() {
  const session = await requireSession();
  if (!isOwnerManager(session)) {
    return (
      <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
        <p className="text-sm">A/R Aging is only available to Owner/Manager logins.</p>
      </main>
    );
  }

  const { rows, grand } = await buildArAging(prisma);

  const th = "px-3 py-2 text-right font-medium text-xs uppercase tracking-wide";
  const thLeft = "px-3 py-2 text-left font-medium text-xs uppercase tracking-wide";

  return (
    <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
      <p className="mb-3">
        <Link href="/admin" className="text-sm" style={{ color: "var(--faint)" }}>&larr; Admin</Link>
      </p>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <div className="eyebrow mb-1">Reports</div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>A/R Aging</h1>
        </div>
        <Link href="/api/reports/ar-aging/export" className="btn">Export CSV</Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--faint)" }}>Nothing outstanding — every account invoice is either paid off or not yet due.</p>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "var(--paper)" }}>
                <th className={thLeft} style={{ color: "var(--faint)" }}>Customer</th>
                <th className={th} style={{ color: "var(--faint)" }}>Current</th>
                <th className={th} style={{ color: "var(--faint)" }}>1–30</th>
                <th className={th} style={{ color: "var(--faint)" }}>31–60</th>
                <th className={th} style={{ color: "var(--faint)" }}>61–90</th>
                <th className={th} style={{ color: "var(--faint)" }}>90+</th>
                <th className={th} style={{ color: "var(--faint)" }}>Total Due</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.customerId}>
                  <td className="px-3 py-2 border-t hairline">
                    <Link href={`/customers?selected=${r.customerId}`} style={{ color: "var(--deep)" }}>{r.customerName}</Link>
                  </td>
                  <td className="px-3 py-2 border-t hairline text-right mono">${r.current.toFixed(2)}</td>
                  <td className="px-3 py-2 border-t hairline text-right mono">${r.d30.toFixed(2)}</td>
                  <td className="px-3 py-2 border-t hairline text-right mono">${r.d60.toFixed(2)}</td>
                  <td className="px-3 py-2 border-t hairline text-right mono">${r.d90.toFixed(2)}</td>
                  <td className="px-3 py-2 border-t hairline text-right mono">${r.d90plus.toFixed(2)}</td>
                  <td className="px-3 py-2 border-t hairline text-right mono font-semibold">${r.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="px-3 py-2 font-semibold" style={{ borderTop: "2px solid var(--deep)" }}>Total</td>
                <td className="px-3 py-2 text-right mono font-semibold" style={{ borderTop: "2px solid var(--deep)" }}>${grand.current.toFixed(2)}</td>
                <td className="px-3 py-2 text-right mono font-semibold" style={{ borderTop: "2px solid var(--deep)" }}>${grand.d30.toFixed(2)}</td>
                <td className="px-3 py-2 text-right mono font-semibold" style={{ borderTop: "2px solid var(--deep)" }}>${grand.d60.toFixed(2)}</td>
                <td className="px-3 py-2 text-right mono font-semibold" style={{ borderTop: "2px solid var(--deep)" }}>${grand.d90.toFixed(2)}</td>
                <td className="px-3 py-2 text-right mono font-semibold" style={{ borderTop: "2px solid var(--deep)" }}>${grand.d90plus.toFixed(2)}</td>
                <td className="px-3 py-2 text-right mono font-semibold" style={{ borderTop: "2px solid var(--deep)" }}>${grand.total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </main>
  );
}
