import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { isOwnerManager } from "@/lib/authz";
import SalesReportClient from "./SalesReportClient";

export const dynamic = "force-dynamic";

export default async function SalesReportPage() {
  const session = await requireSession();
  if (!isOwnerManager(session)) {
    return (
      <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
        <p className="text-sm">Sales Report is only available to Owner/Manager logins.</p>
      </main>
    );
  }

  const invoices = await prisma.invoice.findMany({
    where: { status: "CLOSED" },
    include: { lines: { include: { item: true } } },
    orderBy: { date: "desc" },
  });

  const invoiceSummaries = invoices.map((inv) => ({ date: inv.date.toISOString(), total: Number(inv.total) }));

  const lineRows = invoices.flatMap((inv) =>
    inv.lines.map((l) => ({
      date: inv.date.toISOString(),
      category: l.item?.category || "Uncategorized",
      itemId: l.itemId,
      sku: l.sku,
      name: l.name,
      qty: l.qty,
      ext: Number(l.ext),
    }))
  );

  return (
    <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
      <p className="mb-3">
        <Link href="/admin" className="text-sm" style={{ color: "var(--faint)" }}>&larr; Admin</Link>
      </p>
      <div className="mb-5">
        <div className="eyebrow mb-1">Reports</div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>Sales Report</h1>
      </div>
      <SalesReportClient invoiceSummaries={invoiceSummaries} lineRows={lineRows} />
    </main>
  );
}
