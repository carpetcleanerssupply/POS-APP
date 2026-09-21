import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { poTotal } from "@/lib/purchaseOrders";

const STATUS_LABEL = { DRAFT: "Draft", ORDERED: "Ordered", PARTIAL: "Partially Received", RECEIVED: "Received" };

export const dynamic = "force-dynamic";

export default async function PurchaseOrdersPage() {
  await requireSession();
  const pos = await prisma.purchaseOrder.findMany({ orderBy: { number: "desc" }, take: 200, include: { lines: true } });

  return (
    <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
      <p className="mb-3">
        <Link href="/" className="text-sm" style={{ color: "var(--faint)" }}>&larr; Home</Link>
      </p>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <div>
          <div className="eyebrow mb-1">Purchasing</div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>
            Purchase Orders ({pos.length})
          </h1>
        </div>
        <Link href="/purchase-orders/new" className="btn btn-primary">+ New PO</Link>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: "var(--paper)" }}>
              <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wide" style={{ color: "var(--faint)" }}>#</th>
              <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wide" style={{ color: "var(--faint)" }}>Date</th>
              <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wide" style={{ color: "var(--faint)" }}>Vendor</th>
              <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wide" style={{ color: "var(--faint)" }}>Status</th>
              <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wide" style={{ color: "var(--faint)" }}>Paid</th>
              <th className="px-3 py-2 text-right font-medium text-xs uppercase tracking-wide" style={{ color: "var(--faint)" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {pos.map((po) => (
              <tr key={po.id}>
                <td className="px-3 py-2 border-t hairline">
                  <Link href={`/purchase-orders/${po.id}`} className="font-medium" style={{ color: "var(--deep)" }}>{po.number}</Link>
                </td>
                <td className="px-3 py-2 border-t hairline" style={{ color: "var(--faint)" }}>{new Date(po.date).toLocaleDateString()}</td>
                <td className="px-3 py-2 border-t hairline">{po.vendorName}</td>
                <td className="px-3 py-2 border-t hairline">{STATUS_LABEL[po.status]}</td>
                <td className="px-3 py-2 border-t hairline">{po.paid ? "Yes" : "No"}</td>
                <td className="px-3 py-2 border-t hairline text-right mono font-medium">${poTotal(po.lines).toFixed(2)}</td>
              </tr>
            ))}
            {pos.length === 0 && (
              <tr>
                <td className="px-3 py-8 text-center text-sm border-t hairline" colSpan={6} style={{ color: "var(--faint)" }}>
                  No purchase orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
