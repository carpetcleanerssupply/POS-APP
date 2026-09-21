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

function Segmented({ value, onChange, options }) {
  return (
    <div className="flex rounded overflow-hidden border hairline" style={{ width: "fit-content" }}>
      {options.map(([val, label]) => (
        <button
          key={val}
          type="button"
          onClick={() => onChange(val)}
          className="px-3 py-2 text-sm font-semibold"
          style={{
            backgroundColor: value === val ? "var(--deep)" : "var(--panel)",
            color: value === val ? "#fff" : "var(--ink)",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function NewInvoiceForm({
  items,
  customers,
  estimateId = null,
  invoiceId = null,
  initialCustomerId = null,
  initialLines = [],
  initialSaleType = "WALKIN",
  initialCustomerPO = "",
  initialShipVia = "",
  initialTrackingNumber = "",
  initialNotes = "",
  initialShippingCharge = "0",
  initialDueDate = "",
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState(initialCustomerId || "");
  const [saleType, setSaleType] = useState(initialSaleType);
  const [customerPO, setCustomerPO] = useState(initialCustomerPO);
  const [shipVia, setShipVia] = useState(initialShipVia);
  const [trackingNumber, setTrackingNumber] = useState(initialTrackingNumber);
  const [notes, setNotes] = useState(initialNotes);
  const [shippingCharge, setShippingCharge] = useState(initialShippingCharge);
  const [lines, setLines] = useState(initialLines);
  const [pickerSku, setPickerSku] = useState("");
  const [settledTo, setSettledTo] = useState("PAID_NOW");
  const [paymentMethod, setPaymentMethod] = useState("CARD");
  const [checkNumber, setCheckNumber] = useState("");
  const [dueDate, setDueDate] = useState(initialDueDate);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositMethod, setDepositMethod] = useState("CARD");
  const [depositCheckNumber, setDepositCheckNumber] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(null); // null | "draft" | "close"

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

  const basePayload = {
    customerId,
    saleType,
    customerPO,
    shipVia,
    trackingNumber,
    notes,
    shippingCharge: shipCharge,
    lines: lines.map((l) => ({ itemId: l.itemId, qty: Number(l.qty) || 0, discountPct: l.discountPct, note: l.note })),
    dueDate: settledTo === "ACCOUNT" ? dueDate || null : null,
  };

  async function saveDraft() {
    setError(null);
    if (!customerId) return setError("Select a customer.");
    if (lines.length === 0) return setError("Add at least one line item.");

    setSubmitting("draft");
    try {
      const res = await fetch(invoiceId ? `/api/invoices/${invoiceId}` : "/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoiceId ? basePayload : { ...basePayload, saveAsDraft: true, estimateId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong saving this draft.");
        setSubmitting(null);
        return;
      }
      router.push(`/invoices/${invoiceId || data.id}`);
    } catch {
      setError("Network error — the draft was not saved.");
      setSubmitting(null);
    }
  }

  async function closeInvoice() {
    setError(null);
    if (!customerId) return setError("Select a customer.");
    if (lines.length === 0) return setError("Add at least one line item.");

    setSubmitting("close");
    try {
      const res = await fetch(invoiceId ? `/api/invoices/${invoiceId}/close` : "/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...basePayload,
          settledTo,
          paymentMethod,
          checkNumber,
          depositAmount: settledTo === "ACCOUNT" ? Number(depositAmount) || 0 : 0,
          depositMethod,
          depositCheckNumber,
          estimateId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong closing this invoice.");
        setSubmitting(null);
        return;
      }
      router.push(`/invoices/${invoiceId || data.id}`);
    } catch {
      setError("Network error — the invoice was not saved.");
      setSubmitting(null);
    }
  }

  const isWalkInCustomer = Boolean(customer?.isWalkIn);
  const depositTooBig = settledTo === "ACCOUNT" && Number(depositAmount) > total + 0.005;

  return (
    <div className="flex flex-col gap-4" style={{ maxWidth: 900 }}>
      {error && (
        <p className="px-4 py-3 rounded-lg text-sm" style={{ color: "var(--rust)", backgroundColor: "var(--rust-bg)" }}>{error}</p>
      )}

      {estimateId && (
        <p className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: "#FBF0DA", color: "var(--amber-dark)" }}>
          Converting from estimate — line items were prefilled below. Choose payment to close this invoice.
        </p>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex-1" style={{ minWidth: 260 }}>
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Customer *</div>
          <select
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              const c = customers.find((cust) => cust.id === e.target.value);
              if (c?.isWalkIn) setSettledTo("PAID_NOW");
            }}
            className={inputClass}
            style={{ ...inputStyle, width: "100%" }}
          >
            <option value="">Select a customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.isWalkIn ? " (walk-in)" : ""}
              </option>
            ))}
          </select>
        </div>
        <Segmented value={saleType} onChange={setSaleType} options={[["WALKIN", "Walk-in"], ["PHONE", "Phone order"]]} />
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

        {lineRows.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--faint)" }}>No items on this invoice yet.</p>
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
                  <td className="py-1.5">
                    {r.item ? `${r.item.name} (${r.item.sku})` : "Unknown item"}
                    {r.item && Number(r.qty) > r.item.stock && (
                      <div className="text-xs" style={{ color: "var(--rust)" }}>Only {r.item.stock} in stock</div>
                    )}
                  </td>
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
        <div className="flex-1" style={{ minWidth: 180 }}>
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Customer PO</div>
          <input value={customerPO} onChange={(e) => setCustomerPO(e.target.value)} className={inputClass} style={{ ...inputStyle, width: "100%" }} />
        </div>
        <div className="flex-1" style={{ minWidth: 180 }}>
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Ship Via</div>
          <input value={shipVia} onChange={(e) => setShipVia(e.target.value)} className={inputClass} style={{ ...inputStyle, width: "100%" }} />
        </div>
        <div className="flex-1" style={{ minWidth: 180 }}>
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Tracking #</div>
          <input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} className={inputClass} style={{ ...inputStyle, width: "100%" }} />
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Notes</div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder='e.g. "Customer requested unscented formula" or "Leave at side door"'
          className={inputClass}
          style={{ ...inputStyle, width: "100%", minHeight: 60 }}
        />
      </div>

      <div className="flex justify-between items-start flex-wrap gap-4">
        <div style={{ minWidth: 180 }}>
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Shipping Charge</div>
          <div className="flex items-center gap-1">
            <span style={{ color: "var(--faint)" }}>$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={shippingCharge}
              onChange={(e) => setShippingCharge(e.target.value)}
              className={inputClass}
              style={{ ...inputStyle, width: 120 }}
            />
          </div>
        </div>
        <div className="text-right text-sm">
          <div style={{ color: "var(--faint)" }}>Subtotal: {currency(subtotal)}</div>
          {TAX_RATE > 0 && <div style={{ color: "var(--faint)" }}>Tax: {currency(tax)}</div>}
          <div className="font-semibold text-lg mono mt-1" style={{ color: "var(--deep)" }}>Total: {currency(total)}</div>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex gap-4 flex-wrap items-end">
          <div>
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Settle As</div>
            <select
              value={settledTo}
              onChange={(e) => setSettledTo(e.target.value)}
              disabled={isWalkInCustomer}
              className={inputClass}
              style={inputStyle}
            >
              <option value="PAID_NOW">Paid Now</option>
              <option value="ACCOUNT">Charge to Account</option>
            </select>
            {isWalkInCustomer && (
              <div className="text-xs mt-1" style={{ color: "var(--faint)" }}>Walk-in customers must be paid now.</div>
            )}
          </div>

          {settledTo === "ACCOUNT" && (
            <div>
              <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Due Date</div>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} style={inputStyle} />
            </div>
          )}

          {settledTo === "PAID_NOW" && (
            <div>
              <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Payment Method</div>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={inputClass} style={inputStyle}>
                <option value="CARD">Card</option>
                <option value="CHECK">Check</option>
                <option value="CASH">Cash</option>
              </select>
            </div>
          )}

          {settledTo === "PAID_NOW" && paymentMethod === "CHECK" && (
            <div>
              <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Check Number</div>
              <input value={checkNumber} onChange={(e) => setCheckNumber(e.target.value)} className={inputClass} style={inputStyle} />
            </div>
          )}
        </div>

        {settledTo === "ACCOUNT" && (
          <div className="flex gap-4 flex-wrap items-end mt-3 pt-3 border-t hairline">
            <div>
              <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Deposit Now (optional)</div>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
              {depositTooBig && (
                <div className="text-xs mt-1" style={{ color: "var(--rust)" }}>Can&apos;t exceed the total.</div>
              )}
            </div>
            {Number(depositAmount) > 0 && (
              <>
                <div>
                  <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Deposit Method</div>
                  <select value={depositMethod} onChange={(e) => setDepositMethod(e.target.value)} className={inputClass} style={inputStyle}>
                    <option value="CARD">Card</option>
                    <option value="CHECK">Check</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
                {depositMethod === "CHECK" && (
                  <div>
                    <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Deposit Check #</div>
                    <input value={depositCheckNumber} onChange={(e) => setDepositCheckNumber(e.target.value)} className={inputClass} style={inputStyle} />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={saveDraft} disabled={!!submitting} className="btn">
          {submitting === "draft" ? "Saving..." : "Save Draft"}
        </button>
        <button type="button" onClick={closeInvoice} disabled={!!submitting || depositTooBig} className="btn btn-primary flex-1">
          {submitting === "close" ? "Saving..." : `Save & Close — ${currency(total)}`}
        </button>
        <Link href="/invoices" className="btn" style={{ color: "var(--rust)" }}>Cancel</Link>
      </div>
      <div className="text-xs" style={{ color: "var(--faint)" }}>
        <strong>Save Draft</strong> holds this for later editing — inventory and balances aren&apos;t touched yet.{" "}
        <strong>Save &amp; Close</strong> finalizes it: stock and account balances update, and it can&apos;t be edited afterward.
      </div>
    </div>
  );
}
