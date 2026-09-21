import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { isLowStock, lowStockThreshold, casesPlusEach } from "@/lib/items";
import ItemsTable from "./ItemsTable";

const DELETE_ERROR_MESSAGES = {
  in_use: (count) =>
    `Can't delete — this item appears on ${count} existing invoice, estimate, or PO. Consider setting stock to 0 or renaming it instead.`,
  not_found: () => "That item no longer exists.",
};

export default async function ItemsPage({ searchParams }) {
  await requireSession();
  const params = await searchParams;
  const lowOnly = params?.low === "1";

  const allItems = await prisma.item.findMany({ orderBy: { name: "asc" } });

  const items = allItems.filter((item) => !lowOnly || isLowStock(item));

  const lowStockCount = allItems.filter(isLowStock).length;
  const errorMessage = params?.error && DELETE_ERROR_MESSAGES[params.error]?.(params.count);

  return (
    <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
      <p className="mb-3">
        <Link href="/" className="text-sm" style={{ color: "var(--faint)" }}>&larr; Home</Link>
      </p>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <div>
          <div className="eyebrow mb-1">Item Database</div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>
            Items ({allItems.length})
          </h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          {lowStockCount > 0 && (
            <Link
              href={lowOnly ? "/items" : "/items?low=1"}
              className="btn"
              style={
                lowOnly
                  ? { backgroundColor: "var(--rust)", color: "#fff", borderColor: "var(--rust)" }
                  : { backgroundColor: "var(--rust-bg)", color: "var(--rust)", borderColor: "var(--rust)" }
              }
            >
              {lowOnly ? "Showing Low Stock" : `⚠ ${lowStockCount} Low Stock`}
            </Link>
          )}
          <Link href="/api/items/export" className="btn">Export CSV</Link>
          <Link href="/items/import" className="btn">Import CSV</Link>
          <Link href="/items/new" className="btn btn-primary">+ Add Item</Link>
        </div>
      </div>

      {errorMessage && (
        <p
          className="mb-4 px-4 py-3 rounded-lg text-sm"
          style={{ color: "var(--rust)", backgroundColor: "var(--rust-bg)" }}
        >
          {errorMessage}
        </p>
      )}

      {allItems.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--faint)" }}>No items yet.</p>
      ) : (
        <ItemsTable
          items={items.map((item) => ({
            id: item.id,
            sku: item.sku,
            name: item.name,
            category: item.category,
            vendorName: item.vendorName,
            cost: Number(item.cost),
            price: Number(item.price),
            unit: item.unit,
            caseQty: item.caseQty || 1,
            stock: item.stock,
            lowStockTitle: isLowStock(item) ? `At or below ${lowStockThreshold(item)}` : null,
            casesPlusEach: casesPlusEach(item),
          }))}
        />
      )}
    </main>
  );
}
