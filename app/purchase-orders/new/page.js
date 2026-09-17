import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import POForm from "../POForm";

export const dynamic = "force-dynamic";

export default async function NewPurchaseOrderPage() {
  await requireSession();

  const [items, vendors] = await Promise.all([
    prisma.item.findMany({ orderBy: { name: "asc" } }),
    prisma.vendor.findMany({ orderBy: { name: "asc" } }),
  ]);

  const plainItems = items.map((i) => ({ id: i.id, sku: i.sku, name: i.name, cost: Number(i.cost), caseQty: i.caseQty }));

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 800 }}>
      <p><a href="/purchase-orders">&larr; Back to Purchase Orders</a></p>
      <h1>New Purchase Order</h1>
      {vendors.length === 0 ? (
        <p>You need at least one vendor first. <a href="/vendors/new">Add a vendor</a>.</p>
      ) : plainItems.length === 0 ? (
        <p>You need at least one item first. <a href="/items/new">Add an item</a>.</p>
      ) : (
        <POForm items={plainItems} vendors={vendors.map((v) => ({ id: v.id, name: v.name }))} />
      )}
    </main>
  );
}
