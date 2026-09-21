import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { isPoEditable } from "@/lib/purchaseOrders";
import POForm from "../../POForm";

export const dynamic = "force-dynamic";

export default async function EditPurchaseOrderPage({ params }) {
  await requireSession();
  const { id } = await params;

  const po = await prisma.purchaseOrder.findUnique({ where: { id }, include: { lines: true } });
  if (!po) notFound();

  if (!isPoEditable(po)) {
    return (
      <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
        <p className="text-sm">
          This PO can no longer be edited — receiving has already started.{" "}
          <Link href={`/purchase-orders/${id}`} className="underline" style={{ color: "var(--deep)" }}>View it</Link>.
        </p>
      </main>
    );
  }

  const [items, vendors] = await Promise.all([
    prisma.item.findMany({ orderBy: { name: "asc" } }),
    prisma.vendor.findMany({ orderBy: { name: "asc" } }),
  ]);

  const plainItems = items.map((i) => ({ id: i.id, sku: i.sku, name: i.name, cost: Number(i.cost), caseQty: i.caseQty }));
  const initialLines = po.lines.map((l) => ({
    itemId: l.itemId,
    qtyOrdered: l.qtyOrdered,
    cost: Number(l.cost),
    caseQty: l.caseQty,
    description: l.description || "",
  }));

  return (
    <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
      <p className="mb-3">
        <Link href={`/purchase-orders/${id}`} className="text-sm" style={{ color: "var(--faint)" }}>&larr; Back to PO #{po.number}</Link>
      </p>
      <div className="mb-5">
        <div className="eyebrow mb-1">Purchasing</div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>Edit PO #{po.number}</h1>
      </div>
      <POForm
        items={plainItems}
        vendors={vendors.map((v) => ({ id: v.id, name: v.name }))}
        poId={po.id}
        initialVendorId={po.vendorId}
        initialLines={initialLines}
        initialNotes={po.notes || ""}
      />
    </main>
  );
}
