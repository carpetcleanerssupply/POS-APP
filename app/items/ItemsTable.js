"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Link from "next/link";
import DeleteItemButton from "./DeleteItemButton";

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
    const updates = {};
    for (const [id, fields] of Object.entries(draft)) {
      const entry = {};
      if (fields.stock !== undefined && fields.stock !== "" && !isNaN(Number(fields.stock))) {
        entry.stock = Math.max(0, Math.floor(Number(fields.stock)));
      }
      if (fields.unit !== undefined) {
        entry.unit = fields.unit;
      }
      if (fields.caseQty !== undefined && fields.caseQty !== "" && !isNaN(Number(fields.caseQty))) {
        entry.caseQty = Math.max(1, Math.floor(Number(fields.caseQty)));
      }
      if (Object.keys(entry).length > 0) updates[id] = entry;
    }
    if (Object.keys(updates).length === 0) {
      cancelBulk();
      return;
    }
    setBusy(true);
    setError(null);
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

  const th = "px-3 py-2 text-left font-medium text-xs uppercase tracking-wide";
  const td = "px-3 py-2 border-t hairline";

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by SKU, name, category, or vendor…"
          className="w-full md:max-w-sm px-3 py-2.5 rounded border hairline focus-amber text-sm"
          style={{ backgroundColor: "var(--panel)" }}
        />
        <div className="flex gap-2">
          {bulkMode ? (
            <>
              <button type="button" onClick={cancelBulk} disabled={busy} className="btn">
                Cancel
              </button>
              <button type="button" onClick={saveAll} disabled={busy} className="btn btn-primary">
                {busy ? "Saving..." : "Save All"}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setBulkMode(true)} className="btn">
              Update Stock
            </button>
          )}
        </div>
      </div>

      {bulkMode && (
        <div className="mb-3 px-4 py-2.5 rounded-md text-sm" style={{ backgroundColor: "var(--paper)", color: "var(--faint)" }}>
          Use the search box above to filter first if that&apos;s easier — then edit Unit, Units/Case, and Stock right
          in the table. Nothing saves until you click &quot;Save All.&quot;
        </div>
      )}
      {error && <p className="mb-3 text-sm" style={{ color: "var(--rust)" }}>{error}</p>}

      <div className="card overflow-hidden">
        <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "8%" }} />
            <col style={{ width: "34%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "8%" }} />
          </colgroup>
          <thead>
            <tr style={{ backgroundColor: "var(--paper)" }}>
              <th className={th} style={{ color: "var(--faint)" }}>SKU</th>
              <th className={th} style={{ color: "var(--faint)" }}>Item Name</th>
              <th className={th} style={{ color: "var(--faint)" }}>Vendor</th>
              <th className={`${th} text-right`} style={{ color: "var(--faint)" }}>Cost</th>
              <th className={`${th} text-right`} style={{ color: "var(--faint)" }}>Price</th>
              <th className={`${th} text-center`} style={{ color: "var(--faint)" }}>Unit</th>
              <th className={`${th} text-center`} style={{ color: "var(--faint)" }}>Units/Case</th>
              <th className={`${th} text-center`} style={{ color: "var(--faint)" }}>Stock</th>
              <th
                className={`${th} text-center`}
                style={{ color: "var(--faint)" }}
                title="Cases + individual units — a case-friendly read on Stock, for whoever's counting shelves"
              >
                CS+EA
              </th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.id}>
                <td className={`${td} mono`} style={{ color: "var(--faint)" }}>{item.sku}</td>
                <td className={td} style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
                  {item.name}
                </td>
                <td className={td} style={{ color: "var(--faint)" }}>{item.vendorName || "—"}</td>
                <td className={`${td} text-right mono`} style={{ color: "var(--faint)" }}>${item.cost.toFixed(2)}</td>
                <td className={`${td} text-right mono font-medium`}>${item.price.toFixed(2)}</td>
                <td className={`${td} text-center`}>
                  {bulkMode ? (
                    <input
                      type="text"
                      defaultValue={item.unit || ""}
                      placeholder="ea"
                      onChange={(e) => setDraft((d) => ({ ...d, [item.id]: { ...d[item.id], unit: e.target.value } }))}
                      className="text-center rounded border hairline focus-amber"
                      style={{ width: "100%", padding: "0.3rem", backgroundColor: "var(--panel)" }}
                    />
                  ) : (
                    <span style={{ color: "var(--faint)" }}>{item.unit || "—"}</span>
                  )}
                </td>
                <td className={`${td} text-center`}>
                  {bulkMode ? (
                    <input
                      type="number"
                      min="1"
                      step="1"
                      defaultValue={item.caseQty || 1}
                      onChange={(e) => setDraft((d) => ({ ...d, [item.id]: { ...d[item.id], caseQty: e.target.value } }))}
                      className="text-center rounded border hairline focus-amber"
                      style={{ width: "100%", padding: "0.3rem", backgroundColor: "var(--panel)" }}
                    />
                  ) : (
                    <span className="mono" style={{ color: "var(--faint)" }}>{item.caseQty > 1 ? item.caseQty : "—"}</span>
                  )}
                </td>
                <td className={`${td} text-center`}>
                  {bulkMode ? (
                    <input
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={item.stock}
                      onChange={(e) => setDraft((d) => ({ ...d, [item.id]: { ...d[item.id], stock: e.target.value } }))}
                      className="text-center rounded border hairline focus-amber"
                      style={{ width: 70, padding: "0.3rem", backgroundColor: "var(--panel)" }}
                    />
                  ) : (
                    <span className="mono" style={{ color: item.lowStockTitle ? "var(--rust)" : "var(--moss)" }}>
                      {item.stock}
                      {item.lowStockTitle && <span title={item.lowStockTitle}> ⚠</span>}
                    </span>
                  )}
                </td>
                <td className={`${td} text-center mono`} style={{ color: "var(--faint)" }}>{item.casesPlusEach || "—"}</td>
                <td className={td}>
                  {!bulkMode && (
                    <div className="flex gap-3 justify-end">
                      <Link href={`/items/${item.id}/edit`} className="text-xs font-semibold" style={{ color: "var(--deep)" }}>
                        Edit
                      </Link>
                      <DeleteItemButton itemId={item.id} itemName={item.name} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filteredItems.length === 0 && (
              <tr>
                <td className={`${td} text-center`} colSpan={10} style={{ color: "var(--faint)" }}>
                  No items match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
