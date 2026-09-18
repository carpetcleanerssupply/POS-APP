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
  const q = (params?.q || "").trim().toLowerCase();
  const lowOnly = params?.low === "1";

  const allItems = await prisma.item.findMany({ orderBy: { name: "asc" } });

  const items = allItems.filter((item) => {
    const matchesQuery =
      !q ||
      item.sku.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q) ||
      (item.category || "").toLowerCase().includes(q) ||
      (item.vendorName || "").toLowerCase().includes(q);
    const matchesLow = !lowOnly || isLowStock(item);
    return matchesQuery && matchesLow;
  });

  const lowStockCount = allItems.filter(isLowStock).length;
  const errorMessage = params?.error && DELETE_ERROR_MESSAGES[params.error]?.(params.count);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 960 }}>
      <p><Link href="/">&larr; Home</Link></p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1>Items</h1>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <Link href="/api/items/export" className="btn btn-sm">Export CSV</Link>
          <Link href="/items/import" className="btn btn-sm">Import CSV</Link>
          <Link href="/items/new" style={{ padding: "0.55rem 1rem", background: "#1e3a5f", color: "#fff", borderRadius: 6, textDecoration: "none" }}>
            + Add Item
          </Link>
        </div>
      </div>

      {errorMessage && (
        <p style={{ color: "#c62828", background: "#ffebee", padding: "0.75rem 1rem", borderRadius: 8 }}>
          {errorMessage}
        </p>
      )}

      <form method="GET" style={{ display: "flex", gap: "0.75rem", alignItems: "center", margin: "1.25rem 0" }}>
        <input
          type="text"
          name="q"
          defaultValue={params?.q || ""}
          placeholder="Search SKU, name, category, vendor..."
          style={{ padding: "0.5rem", flex: 1, maxWidth: 320 }}
        />
        {lowOnly && <input type="hidden" name="low" value="1" />}
        <button type="submit" className="btn btn-sm">Search</button>
        <Link
          href={lowOnly ? `/items${q ? `?q=${encodeURIComponent(params.q)}` : ""}` : `/items?low=1${q ? `&q=${encodeURIComponent(params.q)}` : ""}`}
          style={{
            padding: "0.5rem 0.9rem",
            borderRadius: 6,
            border: "1px solid #c62828",
            color: lowOnly ? "#fff" : "#c62828",
            background: lowOnly ? "#c62828" : "transparent",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          {lowOnly ? "Showing Low Stock" : `⚠ ${lowStockCount} Low Stock`}
        </Link>
      </form>

      {allItems.length === 0 ? (
        <p>No items yet.</p>
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
