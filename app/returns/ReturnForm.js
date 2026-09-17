"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function currency(n) {
  return `$${Number(n).toFixed(2)}`;
}

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
    <form onSubmit={submit} style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: "1rem" }}>
      {error && (
        <p style={{ color: "#c62828", background: "#ffebee", padding: "0.75rem 1rem", borderRadius: 8 }}>{error}</p>
      )}

      {lines.length === 0 ? (
        <p style={{ color: "#777" }}>Nothing left on this invoice is eligible to return.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ fontSize: "0.8rem", textAlign: "left" }}>
              <th>Item</th>
              <th style={{ width: 90 }}>Max</th>
              <th style={{ width: 90 }}>Return Qty</th>
              <th style={{ width: 90, textAlign: "right" }}>Ext</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.itemId}>
                <td>{l.name} ({l.sku})</td>
                <td>{l.maxReturnable}</td>
                <td>
                  <input
                    type="number"
                    min="0"
                    max={l.maxReturnable}
                    value={qtys[l.itemId] || 0}
                    onChange={(e) => setQty(l.itemId, e.target.value, l.maxReturnable)}
                    style={{ width: 70, padding: "0.3rem" }}
                  />
                </td>
                <td style={{ textAlign: "right" }}>{currency((qtys[l.itemId] || 0) * l.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ fontWeight: 700 }}>Total: {currency(total)}</div>

      <label>
        Refund Method
        <select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)} style={{ display: "block", padding: "0.5rem", marginTop: "0.25rem" }}>
          <option value="ACCOUNT">Account Credit</option>
          <option value="CARD">Card</option>
          <option value="CHECK">Check</option>
          <option value="CASH">Cash</option>
        </select>
      </label>

      {refundMethod === "CHECK" && (
        <label>
          Check Number
          <input value={checkNumber} onChange={(e) => setCheckNumber(e.target.value)} style={{ display: "block", padding: "0.5rem", marginTop: "0.25rem" }} />
        </label>
      )}

      <label>
        Reason
        <input value={reason} onChange={(e) => setReason(e.target.value)} style={{ display: "block", width: "100%", padding: "0.5rem", marginTop: "0.25rem" }} />
      </label>

      <button type="submit" disabled={busy || lines.length === 0} style={{ padding: "0.6rem 1.2rem", cursor: "pointer" }}>
        {busy ? "Saving..." : "Process Return"}
      </button>
    </form>
  );
}
