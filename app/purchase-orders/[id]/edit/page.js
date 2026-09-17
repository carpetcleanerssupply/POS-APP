import { notFound } from "next/navigation";
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
      <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem" }}>
        <p>This PO can no longer be edited — receiving has already started. <a href={`/purchase-orders/${id}`}>View it</a>.</p>
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
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 800 }}>
      <p><a href={`/purchase-orders/${id}`}>&larr; Back to PO #{po.number}</a></p>
      <h1>Edit PO #{po.number}</h1>
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
