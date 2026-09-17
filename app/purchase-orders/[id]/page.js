import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { isOwnerManager } from "@/lib/authz";
import { poTotal } from "@/lib/purchaseOrders";
import PODetailActions from "../PODetailActions";

const td = { padding: "0.4rem 0.6rem", borderBottom: "1px solid #eee" };
const th = { textAlign: "left", padding: "0.4rem 0.6rem", borderBottom: "2px solid #ddd", fontSize: "0.85rem" };

const STATUS_LABEL = { DRAFT: "Draft", ORDERED: "Ordered", PARTIAL: "Partially Received", RECEIVED: "Received" };

export const dynamic = "force-dynamic";

export default async function PurchaseOrderDetailPage({ params }) {
  const session = await requireSession();
  const { id } = await params;

  const po = await prisma.purchaseOrder.findUnique({ where: { id }, include: { lines: true } });
  if (!po) notFound();

  const total = poTotal(po.lines);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 760 }}>
      <p><a href="/purchase-orders">&larr; Back to Purchase Orders</a></p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>PO #{po.number}</h1>
        <span style={{ padding: "0.3rem 0.7rem", borderRadius: 6, background: "#eee", fontWeight: 600, fontSize: "0.85rem" }}>
          {STATUS_LABEL[po.status]}{po.paid ? " · Paid" : ""}
        </span>
      </div>

      <p style={{ color: "#555" }}>{po.vendorName} &middot; {new Date(po.date).toLocaleDateString()}</p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
        <thead>
          <tr>
            <th style={th}>SKU</th>
            <th style={th}>Item</th>
            <th style={th}>Ordered</th>
            <th style={th}>Received</th>
            <th style={th}>Cost</th>
            <th style={{ ...th, textAlign: "right" }}>Ext</th>
          </tr>
        </thead>
        <tbody>
          {po.lines.map((l) => (
            <tr key={l.id}>
              <td style={td}>{l.sku}</td>
              <td style={td}>{l.name}</td>
              <td style={td}>{l.qtyOrdered}</td>
              <td style={td}>{l.qtyReceived}</td>
              <td style={td}>${Number(l.cost).toFixed(2)}</td>
              <td style={{ ...td, textAlign: "right" }}>${(l.qtyOrdered * Number(l.cost)).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ textAlign: "right", marginTop: "1rem", fontWeight: 700, fontSize: "1.1rem" }}>
        PO Total: ${total.toFixed(2)}
      </div>

      {po.notes && (
        <p style={{ marginTop: "1rem" }}>
          <strong>Notes:</strong> {po.notes}
        </p>
      )}

      <PODetailActions po={po} lines={po.lines} canUnmarkPaid={isOwnerManager(session)} />
    </main>
  );
}
