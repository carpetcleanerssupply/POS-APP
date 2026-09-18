"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function PODetailActions({ po, lines, canUnmarkPaid }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [receiveQtys, setReceiveQtys] = useState({});
  const [payMethod, setPayMethod] = useState("CARD");
  const [payCheckNumber, setPayCheckNumber] = useState("");

  async function call(url, body) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setBusy(false);
        return false;
      }
      router.refresh();
      setBusy(false);
      return true;
    } catch {
      setError("Network error.");
      setBusy(false);
      return false;
    }
  }

  const canReceive = po.status === "ORDERED" || po.status === "PARTIAL";
  const receivableLines = lines.filter((l) => l.qtyReceived < l.qtyOrdered);

  return (
    <div>
      {error && (
        <p style={{ color: "#c62828", background: "#ffebee", padding: "0.75rem 1rem", borderRadius: 8 }}>{error}</p>
      )}

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", margin: "1rem 0" }}>
        {po.status === "DRAFT" && (
          <>
            <Link href={`/purchase-orders/${po.id}/edit`} className="btn btn-sm">Edit</Link>
            <button type="button" className="btn btn-sm" disabled={busy} onClick={() => call(`/api/purchase-orders/${po.id}/mark-ordered`)}>
              Mark Ordered
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              disabled={busy}
              onClick={() => {
                if (confirm("Delete this draft PO?")) call(`/api/purchase-orders/${po.id}/delete`).then((ok) => ok && router.push("/purchase-orders"));
              }}
            >
              Delete
            </button>
          </>
        )}
        {po.status === "ORDERED" && <Link href={`/purchase-orders/${po.id}/edit`} className="btn btn-sm">Edit</Link>}

        {!po.paid && (
          <>
            <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} style={{ padding: "0.5rem" }}>
              <option value="CARD">Card</option>
              <option value="CHECK">Check</option>
              <option value="CASH">Cash</option>
            </select>
            {payMethod === "CHECK" && (
              <input
                placeholder="Check #"
                value={payCheckNumber}
                onChange={(e) => setPayCheckNumber(e.target.value)}
                style={{ padding: "0.3rem", width: 100 }}
              />
            )}
          </>
        )}
        <button
          type="button"
          className="btn btn-sm"
          disabled={busy || (po.paid && !canUnmarkPaid)}
          title={po.paid && !canUnmarkPaid ? "Unmarking as paid requires an Owner/Manager login" : undefined}
          onClick={() => call(`/api/purchase-orders/${po.id}/toggle-paid`, { method: payMethod, checkNumber: payCheckNumber })}
          style={{ cursor: po.paid && !canUnmarkPaid ? "not-allowed" : "pointer" }}
        >
          {po.paid ? "Unmark as Paid" : "Mark as Paid"}
        </button>
      </div>

      {canReceive && receivableLines.length > 0 && (
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1rem", marginTop: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Receive Shipment</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ fontSize: "0.8rem", textAlign: "left" }}>
                <th>Item</th>
                <th>Ordered</th>
                <th>Received</th>
                <th style={{ width: 100 }}>Receive Now</th>
              </tr>
            </thead>
            <tbody>
              {receivableLines.map((l) => {
                const caseQty = l.caseQty || 1;
                const receiveNow = Number(receiveQtys[l.id]) || 0;
                return (
                  <tr key={l.id}>
                    <td>{l.name} ({l.sku})</td>
                    <td>{l.qtyOrdered}</td>
                    <td>{l.qtyReceived}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max={l.qtyOrdered - l.qtyReceived}
                        value={receiveQtys[l.id] || ""}
                        onChange={(e) => setReceiveQtys((prev) => ({ ...prev, [l.id]: e.target.value }))}
                        style={{ width: 70, padding: "0.3rem" }}
                      />
                      {caseQty > 1 && receiveNow > 0 && (
                        <div style={{ fontSize: "0.75rem", color: "#777", marginTop: "0.2rem" }}>= {receiveNow * caseQty} pcs</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() =>
              call(`/api/purchase-orders/${po.id}/receive`, {
                receipts: Object.entries(receiveQtys).map(([lineId, qty]) => ({ lineId, qty })),
              }).then((ok) => ok && setReceiveQtys({}))
            }
            style={{ marginTop: "0.75rem" }}
          >
            Receive
          </button>
        </div>
      )}
    </div>
  );
}
