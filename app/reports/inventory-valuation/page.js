import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { isOwnerManager } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function InventoryValuationPage() {
  const session = await requireSession();
  if (!isOwnerManager(session)) {
    return (
      <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
        <p className="text-sm">Inventory Valuation is only available to Owner/Manager logins.</p>
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

  const th = "px-3 py-2 text-left font-medium text-xs uppercase tracking-wide";

  return (
    <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
      <p className="mb-3">
        <Link href="/admin" className="text-sm" style={{ color: "var(--faint)" }}>&larr; Admin</Link>
      </p>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <div>
          <div className="eyebrow mb-1">Reports</div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>Inventory Valuation</h1>
        </div>
        <Link href="/api/reports/inventory-valuation/export" className="btn">Export CSV</Link>
      </div>
      <p className="text-sm font-semibold mb-5" style={{ color: "var(--deep)" }}>
        Total: ${grandTotal.toFixed(2)} across {grandUnits} unit{grandUnits === 1 ? "" : "s"}
      </p>

      {categories.map(([cat, catItems]) => {
        const catTotal = catItems.reduce((sum, i) => sum + i.stock * Number(i.cost), 0);
        return (
          <div key={cat} className="mb-6">
            <h3 className="text-base font-semibold mb-2" style={{ color: "var(--ink)" }}>{cat} — ${catTotal.toFixed(2)}</h3>
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: "var(--paper)" }}>
                    <th className={th} style={{ color: "var(--faint)" }}>SKU</th>
                    <th className={th} style={{ color: "var(--faint)" }}>Item</th>
                    <th className={th} style={{ color: "var(--faint)" }}>Vendor</th>
                    <th className={th} style={{ color: "var(--faint)" }}>Qty</th>
                    <th className={th} style={{ color: "var(--faint)" }}>Unit Cost</th>
                    <th className={th} style={{ color: "var(--faint)" }}>Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {catItems.map((i) => (
                    <tr key={i.id}>
                      <td className="px-3 py-2 border-t hairline mono" style={{ color: "var(--faint)" }}>{i.sku}</td>
                      <td className="px-3 py-2 border-t hairline">{i.name}</td>
                      <td className="px-3 py-2 border-t hairline" style={{ color: "var(--faint)" }}>{i.vendorName || "—"}</td>
                      <td className="px-3 py-2 border-t hairline">{i.stock}</td>
                      <td className="px-3 py-2 border-t hairline mono">${Number(i.cost).toFixed(2)}</td>
                      <td className="px-3 py-2 border-t hairline mono font-medium">${(i.stock * Number(i.cost)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {items.length === 0 && <p className="text-sm" style={{ color: "var(--faint)" }}>No items yet.</p>}
    </main>
  );
}
