import Link from "next/link";
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
    <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
      <p className="mb-3">
        <Link href="/purchase-orders" className="text-sm" style={{ color: "var(--faint)" }}>&larr; Back to Purchase Orders</Link>
      </p>
      <div className="mb-5">
        <div className="eyebrow mb-1">Purchasing</div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>New Purchase Order</h1>
      </div>
      {vendors.length === 0 ? (
        <p className="text-sm">You need at least one vendor first. <Link href="/vendors/new" className="underline" style={{ color: "var(--deep)" }}>Add a vendor</Link>.</p>
      ) : plainItems.length === 0 ? (
        <p className="text-sm">You need at least one item first. <Link href="/items/new" className="underline" style={{ color: "var(--deep)" }}>Add an item</Link>.</p>
      ) : (
        <POForm items={plainItems} vendors={vendors.map((v) => ({ id: v.id, name: v.name }))} />
      )}
    </main>
  );
}
