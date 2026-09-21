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
    <div className="flex flex-col gap-4" style={{ maxWidth: 800 }}>
      {error && (
        <p className="px-4 py-3 rounded-lg text-sm" style={{ color: "var(--rust)", backgroundColor: "var(--rust-bg)" }}>{error}</p>
      )}

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div className="eyebrow">Current Balance</div>
          <span className="mono text-lg font-semibold" style={{ color: Number(customer.balance) > 0 ? "var(--rust)" : "var(--moss)" }}>
            {currency(customer.balance)}
          </span>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="eyebrow">Open Invoices</div>
        </div>
        {openInvoices.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--faint)" }}>No open invoices — nothing due.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide" style={{ color: "var(--faint)" }}>
                <th className="pb-2"></th>
                <th className="pb-2 font-medium">Invoice #</th>
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium text-right">Total</th>
                <th className="pb-2 font-medium text-right">Owed</th>
              </tr>
            </thead>
            <tbody>
              {openInvoices.map((inv) => (
                <tr key={inv.id} className="border-t hairline">
                  <td className="py-1.5">
                    <input type="checkbox" checked={selectedIds.includes(inv.id)} onChange={() => toggle(inv.id)} />
                  </td>
                  <td className="py-1.5 mono">{inv.number}</td>
                  <td className="py-1.5" style={{ color: "var(--faint)" }}>{new Date(inv.date).toLocaleDateString()}</td>
                  <td className="py-1.5 text-right mono">{currency(inv.total)}</td>
                  <td className="py-1.5 text-right mono" style={{ color: "var(--rust)" }}>{currency(inv.owed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="text-xs mt-3" style={{ color: "var(--faint)" }}>
          Nothing checked — payment will apply automatically to the oldest open invoices first.
        </div>
      </div>

      {creditAvailable > 0.005 && (
        <div className="card p-5">
          <p className="text-sm mb-3">
            Available credit: <strong className="mono">{currency(creditAvailable)}</strong>{" "}
            <span className="text-xs" style={{ color: "var(--faint)" }}>({creditSources.map((s) => s.label).join(", ")})</span>
          </p>
          <button type="button" disabled={busy || selectedIds.length === 0} onClick={() => submit("credit")} className="btn btn-primary">
            Apply Credit to Selected Invoices
          </button>
        </div>
      )}

      <div className="card p-5">
        <div className="eyebrow mb-3">Payment Details</div>
        {selectedIds.length > 0 && (
          <p className="text-xs mb-3" style={{ color: "var(--faint)" }}>
            Selected invoices total {currency(selectedTotal)}.{" "}
            <button type="button" onClick={() => setAmount(selectedTotal.toFixed(2))} className="btn btn-sm" style={{ marginLeft: 4 }}>
              Use this amount
            </button>
          </p>
        )}
        <div className="flex gap-3 flex-wrap items-end mb-3">
          <div>
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Amount</div>
            <div className="flex items-center gap-1">
              <span style={{ color: "var(--faint)" }}>$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="px-3 py-2 rounded border text-sm focus-amber hairline"
                style={{ backgroundColor: "var(--panel)", width: 140 }}
              />
            </div>
          </div>
          <div className="flex gap-0 rounded overflow-hidden border hairline">
            {[
              ["CASH", "Cash"],
              ["CHECK", "Check #"],
              ["CARD", "Credit Card"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMethod(value)}
                className="px-3 py-2 text-sm font-semibold"
                style={{
                  backgroundColor: method === value ? "var(--deep)" : "var(--panel)",
                  color: method === value ? "#fff" : "var(--ink)",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {method === "CHECK" && (
            <input
              placeholder="Check number"
              value={checkNumber}
              onChange={(e) => setCheckNumber(e.target.value)}
              className="px-3 py-2 rounded border text-sm focus-amber hairline"
              style={{ backgroundColor: "var(--panel)" }}
            />
          )}
        </div>
        <p className="text-xs mb-3" style={{ color: "var(--faint)" }}>
          If no invoices are checked above, the payment is applied to all open invoices, oldest first, and any
          leftover becomes credit on the account.
        </p>
        <button type="button" disabled={busy} onClick={() => submit("payment")} className="btn btn-primary w-full">
          {busy ? "Saving..." : "Apply Payment"}
        </button>
      </div>
    </div>
  );
}
