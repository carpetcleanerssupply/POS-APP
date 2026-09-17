import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { isLowStock, lowStockThreshold } from "@/lib/items";
import DeleteItemButton from "./DeleteItemButton";

const DELETE_ERROR_MESSAGES = {
  in_use: (count) =>
    `Can't delete — this item appears on ${count} existing invoice, estimate, or PO. Consider setting stock to 0 or renaming it instead.`,
  not_found: () => "That item no longer exists.",
};

const th = { textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "2px solid #ddd", fontSize: "0.85rem" };
const td = { padding: "0.5rem 0.75rem", borderBottom: "1px solid #eee" };

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
      <p><a href="/">&larr; Home</a></p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1>Items</h1>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <a href="/api/items/export">Export CSV</a>
          <a href="/items/import">Import CSV</a>
          <a href="/items/new" style={{ padding: "0.55rem 1rem", background: "#1a1a1a", color: "#fff", borderRadius: 6, textDecoration: "none" }}>
            + Add Item
          </a>
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
        <button type="submit" style={{ padding: "0.5rem 0.9rem", cursor: "pointer" }}>Search</button>
        <a
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
        </a>
      </form>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>SKU</th>
            <th style={th}>Name</th>
            <th style={th}>Category</th>
            <th style={th}>Vendor</th>
            <th style={th}>Cost</th>
            <th style={th}>Price</th>
            <th style={th}>Stock</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td style={td}>{item.sku}</td>
              <td style={td}>{item.name}</td>
              <td style={td}>{item.category || "—"}</td>
              <td style={td}>{item.vendorName || "—"}</td>
              <td style={td}>${Number(item.cost).toFixed(2)}</td>
              <td style={td}>${Number(item.price).toFixed(2)}</td>
              <td style={td}>
                {item.stock}
                {isLowStock(item) && (
                  <span title={`At or below ${lowStockThreshold(item)}`}> ⚠</span>
                )}
              </td>
              <td style={{ ...td, display: "flex", gap: "0.75rem" }}>
                <a href={`/items/${item.id}/edit`}>Edit</a>
                <DeleteItemButton itemId={item.id} itemName={item.name} />
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td style={td} colSpan={8}>
                {allItems.length === 0 ? "No items yet." : "No items match your filters."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
