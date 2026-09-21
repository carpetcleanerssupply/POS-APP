"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function currency(n) {
  return `$${Number(n).toFixed(2)}`;
}

const inputClass = "px-3 py-2 rounded border text-sm focus-amber hairline";
const inputStyle = { backgroundColor: "var(--panel)" };

export default function ReturnForm({ invoiceId, lines }) {
  const router = useRouter();
  const [qtys, setQtys] = useState({});
  const [refundMethod, setRefundMethod] = useState("ACCOUNT");
  const [checkNumber, setCheckNumber] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function setQty(itemId, value, max) {
    const n = Math.min(max, Math.max(0, Math.floor(Number(value) || 0)));
    setQtys((prev) => ({ ...prev, [itemId]: n }));
  }

  const returnLines = lines
    .map((l) => ({ ...l, qty: qtys[l.itemId] || 0, ext: (qtys[l.itemId] || 0) * l.unitPrice }))
    .filter((l) => l.qty > 0);
  const total = returnLines.reduce((sum, l) => sum + l.ext, 0);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (returnLines.length === 0) return setError("Enter a quantity to return for at least one item.");
    if (refundMethod === "CHECK" && !checkNumber.trim()) return setError("Enter a check number.");

    setBusy(true);
    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          lines: returnLines.map((l) => ({ itemId: l.itemId, qty: l.qty })),
          refundMethod,
          checkNumber,
          reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setBusy(false);
        return;
      }
      router.push(`/invoices/${invoiceId}`);
      router.refresh();
    } catch {
      setError("Network error — nothing was saved.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-5 flex flex-col gap-4" style={{ maxWidth: 800 }}>
      {error && (
        <p className="px-4 py-3 rounded-lg text-sm" style={{ color: "var(--rust)", backgroundColor: "var(--rust-bg)" }}>{error}</p>
      )}

      {lines.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--faint)" }}>Nothing left on this invoice is eligible to return.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide" style={{ color: "var(--faint)" }}>
              <th className="pb-2 font-medium">Item</th>
              <th className="pb-2 font-medium" style={{ width: 90 }}>Max</th>
              <th className="pb-2 font-medium" style={{ width: 90 }}>Return Qty</th>
              <th className="pb-2 font-medium text-right" style={{ width: 90 }}>Ext</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.itemId} className="border-t hairline">
                <td className="py-1.5">{l.name} ({l.sku})</td>
                <td className="py-1.5">{l.maxReturnable}</td>
                <td className="py-1.5">
                  <input
                    type="number"
                    min="0"
                    max={l.maxReturnable}
                    value={qtys[l.itemId] || 0}
                    onChange={(e) => setQty(l.itemId, e.target.value, l.maxReturnable)}
                    className="rounded border hairline focus-amber"
                    style={{ ...inputStyle, width: 70, padding: "0.3rem" }}
                  />
                </td>
                <td className="py-1.5 text-right mono">{currency((qtys[l.itemId] || 0) * l.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="text-right font-semibold text-lg mono" style={{ color: "var(--deep)" }}>Total: {currency(total)}</div>

      <div>
        <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Refund Method</div>
        <select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)} className={inputClass} style={inputStyle}>
          <option value="ACCOUNT">Account Credit</option>
          <option value="CARD">Card</option>
          <option value="CHECK">Check</option>
          <option value="CASH">Cash</option>
        </select>
      </div>

      {refundMethod === "CHECK" && (
        <div>
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Check Number</div>
          <input value={checkNumber} onChange={(e) => setCheckNumber(e.target.value)} className={inputClass} style={inputStyle} />
        </div>
      )}

      <div>
        <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Reason</div>
        <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} style={{ ...inputStyle, width: "100%" }} />
      </div>

      <button type="submit" disabled={busy || lines.length === 0} className="btn btn-primary">
        {busy ? "Saving..." : "Process Return"}
      </button>
    </form>
  );
}
