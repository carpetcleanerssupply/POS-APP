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
        <p className="px-4 py-3 rounded-lg text-sm" style={{ color: "var(--rust)", backgroundColor: "var(--rust-bg)" }}>{error}</p>
      )}

      <div className="flex gap-3 flex-wrap items-center my-4">
        {po.status === "DRAFT" && (
          <>
            <Link href={`/purchase-orders/${po.id}/edit`} className="btn btn-sm">Edit</Link>
            <button type="button" disabled={busy} onClick={() => call(`/api/purchase-orders/${po.id}/mark-ordered`)} className="btn btn-sm">
              Mark Ordered
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (confirm("Delete this draft PO?")) call(`/api/purchase-orders/${po.id}/delete`).then((ok) => ok && router.push("/purchase-orders"));
              }}
              className="text-sm font-semibold"
              style={{ color: "var(--rust)", cursor: "pointer" }}
            >
              Delete
            </button>
          </>
        )}
        {po.status === "ORDERED" && <Link href={`/purchase-orders/${po.id}/edit`} className="btn btn-sm">Edit</Link>}

        {!po.paid && (
          <>
            <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="px-3 py-2 rounded border text-sm hairline" style={{ backgroundColor: "var(--panel)" }}>
              <option value="CARD">Card</option>
              <option value="CHECK">Check</option>
              <option value="CASH">Cash</option>
            </select>
            {payMethod === "CHECK" && (
              <input
                placeholder="Check #"
                value={payCheckNumber}
                onChange={(e) => setPayCheckNumber(e.target.value)}
                className="rounded border hairline focus-amber text-sm"
                style={{ backgroundColor: "var(--panel)", padding: "0.45rem", width: 100 }}
              />
            )}
          </>
        )}
        <button
          type="button"
          disabled={busy || (po.paid && !canUnmarkPaid)}
          title={po.paid && !canUnmarkPaid ? "Unmarking as paid requires an Owner/Manager login" : undefined}
          onClick={() => call(`/api/purchase-orders/${po.id}/toggle-paid`, { method: payMethod, checkNumber: payCheckNumber })}
          className="btn btn-sm btn-primary"
          style={{ cursor: po.paid && !canUnmarkPaid ? "not-allowed" : "pointer" }}
        >
          {po.paid ? "Unmark as Paid" : "Mark as Paid"}
        </button>
      </div>

      {canReceive && receivableLines.length > 0 && (
        <div className="card p-4 mt-4">
          <div className="text-sm font-semibold mb-3" style={{ color: "var(--deep)" }}>Receive Shipment</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide" style={{ color: "var(--faint)" }}>
                <th className="pb-2 font-medium">Item</th>
                <th className="pb-2 font-medium">Ordered</th>
                <th className="pb-2 font-medium">Received</th>
                <th className="pb-2 font-medium" style={{ width: 100 }}>Receive Now</th>
              </tr>
            </thead>
            <tbody>
              {receivableLines.map((l) => {
                const caseQty = l.caseQty || 1;
                const receiveNow = Number(receiveQtys[l.id]) || 0;
                return (
                  <tr key={l.id} className="border-t hairline">
                    <td className="py-1.5">{l.name} ({l.sku})</td>
                    <td className="py-1.5">{l.qtyOrdered}</td>
                    <td className="py-1.5">{l.qtyReceived}</td>
                    <td className="py-1.5">
                      <input
                        type="number"
                        min="0"
                        max={l.qtyOrdered - l.qtyReceived}
                        value={receiveQtys[l.id] || ""}
                        onChange={(e) => setReceiveQtys((prev) => ({ ...prev, [l.id]: e.target.value }))}
                        className="rounded border hairline focus-amber"
                        style={{ backgroundColor: "var(--panel)", width: 70, padding: "0.3rem" }}
                      />
                      {caseQty > 1 && receiveNow > 0 && (
                        <div className="text-xs mt-1" style={{ color: "var(--faint)" }}>= {receiveNow * caseQty} pcs</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              call(`/api/purchase-orders/${po.id}/receive`, {
                receipts: Object.entries(receiveQtys).map(([lineId, qty]) => ({ lineId, qty })),
              }).then((ok) => ok && setReceiveQtys({}))
            }
            className="btn btn-primary mt-3"
          >
            Receive
          </button>
        </div>
      )}
    </div>
  );
}
