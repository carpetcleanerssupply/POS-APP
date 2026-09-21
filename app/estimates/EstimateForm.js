"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TAX_RATE, lineExt } from "@/lib/invoices";

const inputClass = "px-3 py-2 rounded border text-sm focus-amber hairline";
const inputStyle = { backgroundColor: "var(--panel)" };

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
    <form onSubmit={handleSubmit} className="card p-5 flex flex-col gap-4" style={{ maxWidth: 800 }}>
      {error && (
        <p className="px-4 py-3 rounded-lg text-sm" style={{ color: "var(--rust)", backgroundColor: "var(--rust-bg)" }}>{error}</p>
      )}

      <p className="text-sm">Customer: <strong>{customer.name}</strong></p>

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

        {lineRows.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--faint)" }}>No line items yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide" style={{ color: "var(--faint)" }}>
                <th className="pb-2 font-medium">Item</th>
                <th className="pb-2 font-medium" style={{ width: 70 }}>Qty</th>
                <th className="pb-2 font-medium" style={{ width: 80 }}>Disc %</th>
                <th className="pb-2 font-medium text-right" style={{ width: 90 }}>Ext</th>
                <th className="pb-2" style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {lineRows.map((r) => (
                <tr key={r.itemId} className="border-t hairline">
                  <td className="py-1.5">{r.item ? `${r.item.name} (${r.item.sku})` : "Unknown item"}</td>
                  <td className="py-1.5">
                    <input
                      type="number"
                      min="1"
                      value={r.qty}
                      onChange={(e) => updateLine(r.itemId, { qty: e.target.value })}
                      className="rounded border hairline focus-amber"
                      style={{ ...inputStyle, width: 60, padding: "0.3rem" }}
                    />
                  </td>
                  <td className="py-1.5">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={r.discountPct}
                      onChange={(e) => updateLine(r.itemId, { discountPct: e.target.value })}
                      className="rounded border hairline focus-amber"
                      style={{ ...inputStyle, width: 70, padding: "0.3rem" }}
                    />
                  </td>
                  <td className="py-1.5 text-right mono">{currency(r.ext)}</td>
                  <td className="py-1.5">
                    <button type="button" onClick={() => removeLine(r.itemId)} style={{ color: "var(--rust)", cursor: "pointer" }}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="flex-1" style={{ minWidth: 200 }}>
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Expiration Date</div>
          <input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} className={inputClass} style={{ ...inputStyle, width: "100%" }} />
        </div>
        <div className="flex-1" style={{ minWidth: 200 }}>
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Shipping Charge</div>
          <input type="number" min="0" step="0.01" value={shippingCharge} onChange={(e) => setShippingCharge(e.target.value)} className={inputClass} style={{ ...inputStyle, width: "100%" }} />
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Notes</div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} style={{ ...inputStyle, width: "100%", minHeight: 60 }} />
      </div>

      <div className="text-right text-sm">
        <div style={{ color: "var(--faint)" }}>Subtotal: {currency(subtotal)}</div>
        {TAX_RATE > 0 && <div style={{ color: "var(--faint)" }}>Tax: {currency(tax)}</div>}
        <div className="font-semibold text-lg mono mt-1" style={{ color: "var(--deep)" }}>Total: {currency(total)}</div>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={submitting} className="btn btn-primary">
          {submitting ? "Saving..." : "Save Estimate"}
        </button>
        <Link href="/estimates" className="btn">Cancel</Link>
      </div>
    </form>
  );
}
