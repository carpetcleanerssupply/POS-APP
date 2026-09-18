"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function currency(n) {
  return `$${Number(n).toFixed(2)}`;
}

export default function PaymentForm({ customer, openInvoices, creditAvailable, creditSources }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState([]);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CARD");
  const [checkNumber, setCheckNumber] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function toggle(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  const selectedTotal = openInvoices
    .filter((inv) => selectedIds.includes(inv.id))
    .reduce((sum, inv) => sum + inv.owed, 0);

  async function submit(action) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(action === "credit" ? "/api/payments/apply-credit" : "/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "credit"
            ? { customerId: customer.id, invoiceIds: selectedIds }
            : { customerId: customer.id, amount: Number(amount) || 0, method, checkNumber, invoiceIds: selectedIds }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setBusy(false);
        return;
      }
      router.push(`/customers/${customer.id}/edit`);
      router.refresh();
    } catch {
      setError("Network error — nothing was saved.");
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      {error && (
        <p style={{ color: "#c62828", background: "#ffebee", padding: "0.75rem 1rem", borderRadius: 8 }}>{error}</p>
      )}

      <p>
        Current balance:{" "}
        <strong style={{ color: Number(customer.balance) > 0 ? "#c62828" : "#2e7d32" }}>
          {currency(customer.balance)}
        </strong>
      </p>

      <h3>Open Invoices</h3>
      {openInvoices.length === 0 ? (
        <p style={{ color: "#777" }}>No open invoices — nothing due.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1rem" }}>
          <thead>
            <tr style={{ fontSize: "0.8rem", textAlign: "left" }}>
              <th></th>
              <th>Invoice #</th>
              <th>Date</th>
              <th style={{ textAlign: "right" }}>Total</th>
              <th style={{ textAlign: "right" }}>Owed</th>
            </tr>
          </thead>
          <tbody>
            {openInvoices.map((inv) => (
              <tr key={inv.id}>
                <td>
                  <input type="checkbox" checked={selectedIds.includes(inv.id)} onChange={() => toggle(inv.id)} />
                </td>
                <td>{inv.number}</td>
                <td>{new Date(inv.date).toLocaleDateString()}</td>
                <td style={{ textAlign: "right" }}>{currency(inv.total)}</td>
                <td style={{ textAlign: "right" }}>{currency(inv.owed)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {creditAvailable > 0.005 && (
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1rem", marginBottom: "1rem" }}>
          <p>
            Available credit: <strong>{currency(creditAvailable)}</strong>{" "}
            <span style={{ color: "#777", fontSize: "0.85rem" }}>
              ({creditSources.map((s) => s.label).join(", ")})
            </span>
          </p>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || selectedIds.length === 0}
            onClick={() => submit("credit")}
          >
            Apply Credit to Selected Invoices
          </button>
        </div>
      )}

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1rem" }}>
        <h3 style={{ marginTop: 0 }}>Record a Payment</h3>
        {selectedIds.length > 0 && (
          <p style={{ color: "#777", fontSize: "0.85rem" }}>
            Selected invoices total {currency(selectedTotal)}.{" "}
            <button type="button" className="btn btn-sm" onClick={() => setAmount(selectedTotal.toFixed(2))}>
              Use this amount
            </button>
          </p>
        )}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <label>
            Amount
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ display: "block", padding: "0.5rem", marginTop: "0.25rem" }}
            />
          </label>
          <label>
            Method
            <select value={method} onChange={(e) => setMethod(e.target.value)} style={{ display: "block", padding: "0.5rem", marginTop: "0.25rem" }}>
              <option value="CARD">Card</option>
              <option value="CHECK">Check</option>
              <option value="CASH">Cash</option>
            </select>
          </label>
          {method === "CHECK" && (
            <label>
              Check Number
              <input
                value={checkNumber}
                onChange={(e) => setCheckNumber(e.target.value)}
                style={{ display: "block", padding: "0.5rem", marginTop: "0.25rem" }}
              />
            </label>
          )}
        </div>
        <p style={{ color: "#777", fontSize: "0.8rem" }}>
          If no invoices are checked above, the payment is applied to all open invoices, oldest first, and any
          leftover becomes credit on the account.
        </p>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => submit("payment")}>
          {busy ? "Saving..." : "Record Payment"}
        </button>
      </div>
    </div>
  );
}
