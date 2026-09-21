"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Link from "next/link";
import DeleteItemButton from "./DeleteItemButton";

const th = { textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "2px solid #ddd", fontSize: "0.85rem" };
const td = { padding: "0.5rem 0.75rem", borderBottom: "1px solid #e6ddc9" };

export default function ItemsTable({ items }) {
  const router = useRouter();
  const [bulkMode, setBulkMode] = useState(false);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.sku.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        (item.category || "").toLowerCase().includes(q) ||
        (item.vendorName || "").toLowerCase().includes(q)
    );
  }, [items, query]);

  function cancelBulk() {
    setBulkMode(false);
    setDraft({});
    setError(null);
  }

  async function saveAll() {
    const changed = Object.entries(draft).filter(([, val]) => val !== "" && !isNaN(Number(val)));
    if (changed.length === 0) {
      cancelBulk();
      return;
    }
    setBusy(true);
    setError(null);
    const updates = Object.fromEntries(changed.map(([id, val]) => [id, Math.max(0, Math.floor(Number(val)))]));
    const res = await fetch("/api/items/bulk-update-stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      setBusy(false);
      return;
    }
    setBusy(false);
    cancelBulk();
    router.refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search SKU, name, category, vendor..."
          style={{ padding: "0.5rem", flex: 1, maxWidth: 320 }}
        />
        <div style={{ display: "flex", gap: "0.75rem" }}>
        {bulkMode ? (
          <>
            <button type="button" onClick={cancelBulk} disabled={busy} style={{ padding: "0.4rem 0.8rem", cursor: "pointer" }}>
              Cancel
            </button>
            <button
              type="button"
              onClick={saveAll}
              disabled={busy}
              style={{ padding: "0.4rem 0.8rem", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
            >
              {busy ? "Saving..." : "Save All"}
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setBulkMode(true)} style={{ padding: "0.4rem 0.8rem", cursor: "pointer" }}>
            Update Stock
          </button>
        )}
        </div>
      </div>

      {bulkMode && (
        <p style={{ background: "#f7f2e8", padding: "0.6rem 0.9rem", borderRadius: 8, fontSize: "0.85rem", color: "#555" }}>
          Use the search box above to filter first if that&apos;s easier — then just tab down the Stock column entering
          counts. Nothing saves until you click &quot;Save All.&quot;
        </p>
      )}
      {error && <p style={{ color: "#c62828" }}>{error}</p>}

      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "9%" }} />
          <col style={{ width: "22%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "6%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "6%" }} />
          <col style={{ width: "7%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={th}>SKU</th>
            <th style={th}>Name</th>
            <th style={th}>Category</th>
            <th style={th}>Vendor</th>
            <th style={th}>Cost</th>
            <th style={th}>Price</th>
            <th style={th}>Unit</th>
            <th style={th}>Units/Case</th>
            <th style={th}>Stock</th>
            <th style={th} title="Cases + individual units — a case-friendly read on Stock, for whoever's counting shelves">CS+EA</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.map((item, index) => (
            <tr key={item.id} style={{ background: index % 2 === 1 ? "#f7f2e8" : "#fff" }}>
              <td style={td}>{item.sku}</td>
              <td style={{ ...td, whiteSpace: "normal", wordBreak: "break-word" }}>{item.name}</td>
              <td style={td}>{item.category || "—"}</td>
              <td style={td}>{item.vendorName || "—"}</td>
              <td style={td}>${item.cost.toFixed(2)}</td>
              <td style={td}>${item.price.toFixed(2)}</td>
              <td style={td}>{item.unit || "—"}</td>
              <td style={td}>{item.caseQty > 1 ? item.caseQty : "—"}</td>
              <td style={td}>
                {bulkMode ? (
                  <input
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={item.stock}
                    onChange={(e) => setDraft((d) => ({ ...d, [item.id]: e.target.value }))}
                    style={{ width: 70, padding: "0.3rem" }}
                  />
                ) : (
                  <>
                    {item.stock}
                    {item.lowStockTitle && <span title={item.lowStockTitle}> ⚠</span>}
                  </>
                )}
              </td>
              <td style={td}>{item.casesPlusEach || "—"}</td>
              <td style={{ ...td, display: "flex", gap: "0.75rem" }}>
                {!bulkMode && (
                  <>
                    <Link href={`/items/${item.id}/edit`}>Edit</Link>
                    <DeleteItemButton itemId={item.id} itemName={item.name} />
                  </>
                )}
              </td>
            </tr>
          ))}
          {filteredItems.length === 0 && (
            <tr>
              <td style={td} colSpan={11}>No items match your filters.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
