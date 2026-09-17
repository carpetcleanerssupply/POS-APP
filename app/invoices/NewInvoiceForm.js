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

export default function NewInvoiceForm({ items, customers }) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [saleType, setSaleType] = useState("WALKIN");
  const [customerPO, setCustomerPO] = useState("");
  const [shipVia, setShipVia] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [shippingCharge, setShippingCharge] = useState("0");
  const [lines, setLines] = useState([]);
  const [pickerSku, setPickerSku] = useState("");
  const [settledTo, setSettledTo] = useState("PAID_NOW");
  const [paymentMethod, setPaymentMethod] = useState("CARD");
  const [checkNumber, setCheckNumber] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const customer = customers.find((c) => c.id === customerId) || null;
  const itemsById = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items]);

  const lineRows = lines.map((l) => {
    const item = itemsById[l.itemId];
    return { ...l, item, ext: item ? lineExt(item.price, Number(l.qty) || 0, l.discountPct) : 0 };
  });

  const subtotal = lineRows.reduce((sum, r) => sum + r.ext, 0);
  const tax = customer?.taxExempt ? 0 : subtotal * TAX_RATE;
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
      if (existing) {
        return prev.map((l) => (l.itemId === item.id ? { ...l, qty: (Number(l.qty) || 0) + 1 } : l));
      }
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

    if (!customerId) return setError("Select a customer.");
    if (lines.length === 0) return setError("Add at least one line item.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          saleType,
          customerPO,
          shipVia,
          trackingNumber,
          notes,
          shippingCharge: shipCharge,
          lines: lines.map((l) => ({ itemId: l.itemId, qty: Number(l.qty) || 0, discountPct: l.discountPct, note: l.note })),
          settledTo,
          paymentMethod,
          checkNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong saving this invoice.");
        setSubmitting(false);
        return;
      }
      router.push(`/invoices/${data.id}`);
    } catch (err) {
      setError("Network error — the invoice was not saved.");
      setSubmitting(false);
    }
  }

  const isWalkInCustomer = Boolean(customer?.isWalkIn);

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 760, display: "flex", flexDirection: "column", gap: "1rem" }}>
      {error && (
        <p style={{ color: "#c62828", background: "#ffebee", padding: "0.75rem 1rem", borderRadius: 8 }}>{error}</p>
      )}

      <div style={rowStyle}>
        <label style={labelStyle}>
          Customer *
          <select
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              const c = customers.find((cust) => cust.id === e.target.value);
              if (c?.isWalkIn) setSettledTo("PAID_NOW");
            }}
            style={fieldStyle}
          >
            <option value="">Select a customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.isWalkIn ? " (walk-in)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Sale Type
          <select value={saleType} onChange={(e) => setSaleType(e.target.value)} style={fieldStyle}>
            <option value="WALKIN">Walk-in</option>
            <option value="PHONE">Phone</option>
          </select>
        </label>
      </div>

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
                  <td>
                    {r.item ? `${r.item.name} (${r.item.sku})` : "Unknown item"}
                    {r.item && Number(r.qty) > r.item.stock && (
                      <div style={{ color: "#c62828", fontSize: "0.8rem" }}>
                        Only {r.item.stock} in stock
                      </div>
                    )}
                  </td>
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
          Customer PO
          <input value={customerPO} onChange={(e) => setCustomerPO(e.target.value)} style={fieldStyle} />
        </label>
        <label style={labelStyle}>
          Ship Via
          <input value={shipVia} onChange={(e) => setShipVia(e.target.value)} style={fieldStyle} />
        </label>
        <label style={labelStyle}>
          Tracking #
          <input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} style={fieldStyle} />
        </label>
      </div>

      <label>
        Notes
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...fieldStyle, minHeight: 60 }} />
      </label>

      <div style={rowStyle}>
        <label style={labelStyle}>
          Shipping Charge
          <input
            type="number"
            min="0"
            step="0.01"
            value={shippingCharge}
            onChange={(e) => setShippingCharge(e.target.value)}
            style={fieldStyle}
          />
        </label>
      </div>

      <div style={{ textAlign: "right", fontSize: "0.95rem" }}>
        <div>Subtotal: {currency(subtotal)}</div>
        {TAX_RATE > 0 && <div>Tax: {currency(tax)}</div>}
        <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>Total: {currency(total)}</div>
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1rem" }}>
        <div style={rowStyle}>
          <label style={labelStyle}>
            Settle As
            <select
              value={settledTo}
              onChange={(e) => setSettledTo(e.target.value)}
              disabled={isWalkInCustomer}
              style={fieldStyle}
            >
              <option value="PAID_NOW">Paid Now</option>
              <option value="ACCOUNT">Charge to Account</option>
            </select>
            {isWalkInCustomer && (
              <span style={{ fontSize: "0.8rem", color: "#777" }}>Walk-in customers must be paid now.</span>
            )}
          </label>

          {settledTo === "PAID_NOW" && (
            <label style={labelStyle}>
              Payment Method
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={fieldStyle}>
                <option value="CARD">Card</option>
                <option value="CHECK">Check</option>
                <option value="CASH">Cash</option>
              </select>
            </label>
          )}

          {settledTo === "PAID_NOW" && paymentMethod === "CHECK" && (
            <label style={labelStyle}>
              Check Number
              <input value={checkNumber} onChange={(e) => setCheckNumber(e.target.value)} style={fieldStyle} />
            </label>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button type="submit" disabled={submitting} style={{ padding: "0.7rem 1.4rem", cursor: "pointer" }}>
          {submitting ? "Saving..." : "Close Invoice"}
        </button>
        <a href="/invoices" style={{ padding: "0.7rem 1.4rem", alignSelf: "center" }}>
          Cancel
        </a>
      </div>
    </form>
  );
}
