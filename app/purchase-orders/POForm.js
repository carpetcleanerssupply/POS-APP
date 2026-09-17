"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const fieldStyle = { display: "block", width: "100%", padding: "0.5rem", marginTop: "0.25rem" };

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
    <form onSubmit={handleSubmit} style={{ maxWidth: 760, display: "flex", flexDirection: "column", gap: "1rem" }}>
      {error && (
        <p style={{ color: "#c62828", background: "#ffebee", padding: "0.75rem 1rem", borderRadius: 8 }}>{error}</p>
      )}

      <label>
        Vendor *
        <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} style={fieldStyle}>
          <option value="">Select a vendor...</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      </label>

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
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
            style={{ ...fieldStyle, marginTop: 0, flex: 1 }}
          />
          <datalist id="item-options">
            {items.map((i) => (
              <option key={i.id} value={i.sku}>{`${i.sku} — ${i.name}`}</option>
            ))}
          </datalist>
          <button type="button" onClick={addLine} style={{ padding: "0 1rem", cursor: "pointer" }}>
            Add
          </button>
        </div>

        {lines.length === 0 ? (
          <p style={{ color: "#777" }}>No line items yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ fontSize: "0.8rem", textAlign: "left" }}>
                <th>Item</th>
                <th style={{ width: 80 }}>Qty</th>
                <th style={{ width: 90 }}>Cost</th>
                <th style={{ width: 80 }}>Case Qty</th>
                <th style={{ width: 90, textAlign: "right" }}>Ext</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const item = itemsById[l.itemId];
                return (
                  <tr key={l.itemId}>
                    <td>{item ? `${item.name} (${item.sku})` : "Unknown item"}</td>
                    <td>
                      <input type="number" min="1" value={l.qtyOrdered} onChange={(e) => updateLine(l.itemId, { qtyOrdered: e.target.value })} style={{ width: 60, padding: "0.3rem" }} />
                    </td>
                    <td>
                      <input type="number" min="0" step="0.01" value={l.cost} onChange={(e) => updateLine(l.itemId, { cost: e.target.value })} style={{ width: 80, padding: "0.3rem" }} />
                    </td>
                    <td>
                      <input type="number" min="1" value={l.caseQty} onChange={(e) => updateLine(l.itemId, { caseQty: e.target.value })} style={{ width: 60, padding: "0.3rem" }} />
                    </td>
                    <td style={{ textAlign: "right" }}>{currency((Number(l.qtyOrdered) || 0) * (Number(l.cost) || 0))}</td>
                    <td>
                      <button type="button" onClick={() => removeLine(l.itemId)} style={{ color: "#c62828", cursor: "pointer" }}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <label>
        Notes
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...fieldStyle, minHeight: 60 }} />
      </label>

      <div style={{ fontWeight: 700, fontSize: "1.1rem", textAlign: "right" }}>PO Total: {currency(total)}</div>

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button type="submit" disabled={submitting} style={{ padding: "0.7rem 1.4rem", cursor: "pointer" }}>
          {submitting ? "Saving..." : poId ? "Save Changes" : "Create Draft PO"}
        </button>
        <a href="/purchase-orders" style={{ padding: "0.7rem 1.4rem", alignSelf: "center" }}>Cancel</a>
      </div>
    </form>
  );
}
