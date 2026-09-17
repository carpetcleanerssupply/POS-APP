"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TAX_RATE, lineExt } from "@/lib/invoices";

const fieldStyle = { display: "block", width: "100%", padding: "0.5rem", marginTop: "0.25rem" };
const rowStyle = { display: "flex", gap: "1rem" };
const labelStyle = { flex: 1, fontSize: "0.9rem" };

function currency(n) {
  return `$${Number(n).toFixed(2)}`;
}

export default function EstimateForm({ items, customer, estimateId, initialLines = [], initialExpiration = "", initialNotes = "", initialShippingCharge = "0" }) {
  const router = useRouter();
  const [expirationDate, setExpirationDate] = useState(initialExpiration);
  const [notes, setNotes] = useState(initialNotes);
  const [shippingCharge, setShippingCharge] = useState(initialShippingCharge);
  const [lines, setLines] = useState(initialLines);
  const [pickerSku, setPickerSku] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const itemsById = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items]);

  const lineRows = lines.map((l) => {
    const item = itemsById[l.itemId];
    return { ...l, item, ext: item ? lineExt(item.price, Number(l.qty) || 0, l.discountPct) : 0 };
  });

  const subtotal = lineRows.reduce((sum, r) => sum + r.ext, 0);
  const tax = customer.taxExempt ? 0 : subtotal * TAX_RATE;
  const shipCharge = Math.max(0, Number(shippingCharge) || 0);
  const total = subtotal + shipCharge + tax;

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
      if (existing) return prev.map((l) => (l.itemId === item.id ? { ...l, qty: (Number(l.qty) || 0) + 1 } : l));
      return [...prev, { itemId: item.id, qty: 1, discountPct: 0, note: "" }];
    });
    setPickerSku("");
  }

  function updateLine(itemId, patch) {
    setLines((prev) => prev.map((l) => (l.itemId === itemId ? { ...l, ...patch } : l)));
  }

  function removeLine(itemId) {
    setLines((prev) => prev.filter((l) => l.itemId !== itemId));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (lines.length === 0) return setError("Add at least one line item.");

    setSubmitting(true);
    try {
      const res = await fetch(estimateId ? `/api/estimates/${estimateId}` : "/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          expirationDate: expirationDate || null,
          notes,
          shippingCharge: shipCharge,
          lines: lines.map((l) => ({ itemId: l.itemId, qty: Number(l.qty) || 0, discountPct: l.discountPct, note: l.note })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong saving this estimate.");
        setSubmitting(false);
        return;
      }
      router.push(`/estimates/${data.id}`);
    } catch {
      setError("Network error — the estimate was not saved.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 760, display: "flex", flexDirection: "column", gap: "1rem" }}>
      {error && (
        <p style={{ color: "#c62828", background: "#ffebee", padding: "0.75rem 1rem", borderRadius: 8 }}>{error}</p>
      )}

      <p>Customer: <strong>{customer.name}</strong></p>

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

        {lineRows.length === 0 ? (
          <p style={{ color: "#777" }}>No line items yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ fontSize: "0.8rem", textAlign: "left" }}>
                <th>Item</th>
                <th style={{ width: 70 }}>Qty</th>
                <th style={{ width: 80 }}>Disc %</th>
                <th style={{ width: 90, textAlign: "right" }}>Ext</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {lineRows.map((r) => (
                <tr key={r.itemId}>
                  <td>{r.item ? `${r.item.name} (${r.item.sku})` : "Unknown item"}</td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      value={r.qty}
                      onChange={(e) => updateLine(r.itemId, { qty: e.target.value })}
                      style={{ width: 60, padding: "0.3rem" }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={r.discountPct}
                      onChange={(e) => updateLine(r.itemId, { discountPct: e.target.value })}
                      style={{ width: 70, padding: "0.3rem" }}
                    />
                  </td>
                  <td style={{ textAlign: "right" }}>{currency(r.ext)}</td>
                  <td>
                    <button type="button" onClick={() => removeLine(r.itemId)} style={{ color: "#c62828", cursor: "pointer" }}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={rowStyle}>
        <label style={labelStyle}>
          Expiration Date
          <input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} style={fieldStyle} />
        </label>
        <label style={labelStyle}>
          Shipping Charge
          <input type="number" min="0" step="0.01" value={shippingCharge} onChange={(e) => setShippingCharge(e.target.value)} style={fieldStyle} />
        </label>
      </div>

      <label>
        Notes
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...fieldStyle, minHeight: 60 }} />
      </label>

      <div style={{ textAlign: "right", fontSize: "0.95rem" }}>
        <div>Subtotal: {currency(subtotal)}</div>
        {TAX_RATE > 0 && <div>Tax: {currency(tax)}</div>}
        <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>Total: {currency(total)}</div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button type="submit" disabled={submitting} style={{ padding: "0.7rem 1.4rem", cursor: "pointer" }}>
          {submitting ? "Saving..." : "Save Estimate"}
        </button>
        <a href="/estimates" style={{ padding: "0.7rem 1.4rem", alignSelf: "center" }}>
          Cancel
        </a>
      </div>
    </form>
  );
}
