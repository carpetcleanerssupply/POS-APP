import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { isOwnerManager } from "@/lib/authz";

const th = { textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "2px solid #ddd", fontSize: "0.85rem" };
const td = { padding: "0.5rem 0.75rem", borderBottom: "1px solid #eee" };

export const dynamic = "force-dynamic";

export default async function InventoryValuationPage() {
  const session = await requireSession();
  if (!isOwnerManager(session)) {
    return (
      <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem" }}>
        <p>Inventory Valuation is only available to Owner/Manager logins.</p>
      </main>
    );
  }

  const items = await prisma.item.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });

  const grouped = {};
  for (const i of items) {
    const cat = i.category || "Uncategorized";
    (grouped[cat] ||= []).push(i);
  }
  const categories = Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));

  const grandTotal = items.reduce((sum, i) => sum + i.stock * Number(i.cost), 0);
  const grandUnits = items.reduce((sum, i) => sum + i.stock, 0);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 900 }}>
      <p><a href="/admin">&larr; Admin</a></p>
      <h1>Inventory Valuation</h1>
      <p style={{ fontWeight: 700 }}>
        Total: ${grandTotal.toFixed(2)} across {grandUnits} unit{grandUnits === 1 ? "" : "s"}
      </p>

      {categories.map(([cat, catItems]) => {
        const catTotal = catItems.reduce((sum, i) => sum + i.stock * Number(i.cost), 0);
        return (
          <div key={cat} style={{ marginTop: "1.5rem" }}>
            <h3>{cat} — ${catTotal.toFixed(2)}</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>SKU</th>
                  <th style={th}>Item</th>
                  <th style={th}>Vendor</th>
                  <th style={th}>Qty</th>
                  <th style={th}>Unit Cost</th>
                  <th style={th}>Total Value</th>
                </tr>
              </thead>
              <tbody>
                {catItems.map((i) => (
                  <tr key={i.id}>
                    <td style={td}>{i.sku}</td>
                    <td style={td}>{i.name}</td>
                    <td style={td}>{i.vendorName || "—"}</td>
                    <td style={td}>{i.stock}</td>
                    <td style={td}>${Number(i.cost).toFixed(2)}</td>
                    <td style={td}>${(i.stock * Number(i.cost)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {items.length === 0 && <p style={{ color: "#777" }}>No items yet.</p>}
    </main>
  );
}
