"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const inputClass = "w-full px-3 py-2 rounded border text-sm focus-amber hairline";
const inputStyle = { backgroundColor: "var(--panel)" };

function currency(n) {
  return `$${Number(n).toFixed(2)}`;
}

export default function POForm({ items, vendors, poId, initialVendorId = "", initialLines = [], initialNotes = "" }) {
  const router = useRouter();
  const [vendorId, setVendorId] = useState(initialVendorId || vendors[0]?.id || "");
  const [notes, setNotes] = useState(initialNotes);
  const [lines, setLines] = useState(initialLines);
  const [pickerSku, setPickerSku] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const itemsById = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items]);

  function addLine() {
    const q = pickerSku.trim().toLowerCase();
    if (!q) return;
    const item = items.find((i) => i.sku.toLowerCase() === q || i.name.toLowerCase() === q);
    if (!item) {
      setError(`No item found matching "${pickerSku}".`);
      return;
    }
    setError(null);
    setLines((prev) => {
      const existing = prev.find((l) => l.itemId === item.id);
      if (existing) return prev.map((l) => (l.itemId === item.id ? { ...l, qtyOrdered: (Number(l.qtyOrdered) || 0) + 1 } : l));
      return [...prev, { itemId: item.id, qtyOrdered: 1, cost: item.cost, caseQty: item.caseQty, description: "" }];
    });
    setPickerSku("");
  }

  function updateLine(itemId, patch) {
    setLines((prev) => prev.map((l) => (l.itemId === itemId ? { ...l, ...patch } : l)));
  }

  function removeLine(itemId) {
    setLines((prev) => prev.filter((l) => l.itemId !== itemId));
  }

  const total = lines.reduce((sum, l) => sum + (Number(l.qtyOrdered) || 0) * (Number(l.cost) || 0), 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!vendorId) return setError("Select a vendor.");
    if (lines.length === 0) return setError("Add at least one line item.");

    setSubmitting(true);
    try {
      const res = await fetch(poId ? `/api/purchase-orders/${poId}` : "/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId,
          notes,
          lines: lines.map((l) => ({
            itemId: l.itemId,
            qtyOrdered: Number(l.qtyOrdered) || 0,
            cost: Number(l.cost) || 0,
            caseQty: Number(l.caseQty) || 1,
            description: l.description,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong saving this PO.");
        setSubmitting(false);
        return;
      }
      router.push(`/purchase-orders/${data.id || poId}`);
    } catch {
      setError("Network error — the PO was not saved.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 flex flex-col gap-4" style={{ maxWidth: 800 }}>
      {error && (
        <p className="px-4 py-3 rounded-lg text-sm" style={{ color: "var(--rust)", backgroundColor: "var(--rust-bg)" }}>{error}</p>
      )}

      <div>
        <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Vendor *</div>
        <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={inputClass} style={inputStyle}>
          <option value="">Select a vendor...</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      </div>

      <div className="rounded-lg p-4" style={{ backgroundColor: "var(--paper)", border: "1px solid var(--line)" }}>
        <div className="flex gap-2 mb-3">
          <input
            value={pickerSku}
            onChange={(e) => setPickerSku(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addLine();
              }
            }}
            list="item-options"
            placeholder="Enter SKU or item name, then Add"
            className={inputClass}
            style={{ ...inputStyle, flex: 1 }}
          />
          <datalist id="item-options">
            {items.map((i) => (
              <option key={i.id} value={i.sku}>{`${i.sku} — ${i.name}`}</option>
            ))}
          </datalist>
          <button type="button" onClick={addLine} className="btn btn-sm">Add</button>
        </div>

        {lines.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--faint)" }}>No line items yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide" style={{ color: "var(--faint)" }}>
                <th className="pb-2 font-medium">Item</th>
                <th className="pb-2 font-medium" style={{ width: 80 }}>Qty</th>
                <th className="pb-2 font-medium" style={{ width: 90 }}>Cost</th>
                <th className="pb-2 font-medium" style={{ width: 80 }}>Case Qty</th>
                <th className="pb-2 font-medium text-right" style={{ width: 90 }}>Ext</th>
                <th className="pb-2" style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const item = itemsById[l.itemId];
                return (
                  <tr key={l.itemId} className="border-t hairline">
                    <td className="py-1.5">{item ? `${item.name} (${item.sku})` : "Unknown item"}</td>
                    <td className="py-1.5">
                      <input type="number" min="1" value={l.qtyOrdered} onChange={(e) => updateLine(l.itemId, { qtyOrdered: e.target.value })} className="rounded border hairline focus-amber" style={{ ...inputStyle, width: 60, padding: "0.3rem" }} />
                    </td>
                    <td className="py-1.5">
                      <input type="number" min="0" step="0.01" value={l.cost} onChange={(e) => updateLine(l.itemId, { cost: e.target.value })} className="rounded border hairline focus-amber" style={{ ...inputStyle, width: 80, padding: "0.3rem" }} />
                    </td>
                    <td className="py-1.5">
                      <input type="number" min="1" value={l.caseQty} onChange={(e) => updateLine(l.itemId, { caseQty: e.target.value })} className="rounded border hairline focus-amber" style={{ ...inputStyle, width: 60, padding: "0.3rem" }} />
                    </td>
                    <td className="py-1.5 text-right mono">{currency((Number(l.qtyOrdered) || 0) * (Number(l.cost) || 0))}</td>
                    <td className="py-1.5">
                      <button type="button" onClick={() => removeLine(l.itemId)} style={{ color: "var(--rust)", cursor: "pointer" }}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Notes</div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} style={{ ...inputStyle, minHeight: 60 }} />
      </div>

      <div className="text-right font-semibold text-lg mono" style={{ color: "var(--deep)" }}>PO Total: {currency(total)}</div>

      <div className="flex gap-3">
        <button type="submit" disabled={submitting} className="btn btn-primary">
          {submitting ? "Saving..." : poId ? "Save Changes" : "Create Draft PO"}
        </button>
        <Link href="/purchase-orders" className="btn">Cancel</Link>
      </div>
    </form>
  );
}
