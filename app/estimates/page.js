import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function EstimatesPage() {
  await requireSession();
  const estimates = await prisma.estimate.findMany({ orderBy: { number: "desc" }, take: 200 });

  const th = "px-3 py-2 text-left font-medium text-xs uppercase tracking-wide";

  return (
    <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
      <p className="mb-3">
        <Link href="/" className="text-sm" style={{ color: "var(--faint)" }}>&larr; Home</Link>
      </p>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <div>
          <div className="eyebrow mb-1">Estimates</div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>
            Estimates ({estimates.length})
          </h1>
        </div>
        <Link href="/estimates/new" className="btn btn-primary">+ New Estimate</Link>
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
            {estimates.map((e) => (
              <tr key={e.id}>
                <td className="px-3 py-2 border-t hairline">
                  <Link href={`/estimates/${e.id}`} className="font-medium mono" style={{ color: "var(--deep)" }}>{e.number}</Link>
                </td>
                <td className="px-3 py-2 border-t hairline" style={{ color: "var(--faint)" }}>{new Date(e.date).toLocaleDateString()}</td>
                <td className="px-3 py-2 border-t hairline">{e.customerName}</td>
                <td className="px-3 py-2 border-t hairline">{e.status === "CONVERTED" ? "Converted" : "Open"}</td>
                <td className="px-3 py-2 border-t hairline text-right mono font-medium">${Number(e.total).toFixed(2)}</td>
              </tr>
            ))}
            {estimates.length === 0 && (
              <tr>
                <td className="px-3 py-8 text-center text-sm border-t hairline" colSpan={5} style={{ color: "var(--faint)" }}>
                  No estimates yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
