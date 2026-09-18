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
      <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem" }}>
        <p>Sales Report is only available to Owner/Manager logins.</p>
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
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 1000 }}>
      <p><Link href="/admin">&larr; Admin</Link></p>
      <h1>Sales Report</h1>
      <SalesReportClient invoiceSummaries={invoiceSummaries} lineRows={lineRows} />
    </main>
  );
}
