import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { poTotal } from "@/lib/purchaseOrders";

const th = { textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "2px solid #ddd", fontSize: "0.85rem" };
const td = { padding: "0.5rem 0.75rem", borderBottom: "1px solid #eee" };
const STATUS_LABEL = { DRAFT: "Draft", ORDERED: "Ordered", PARTIAL: "Partially Received", RECEIVED: "Received" };

export const dynamic = "force-dynamic";

export default async function PurchaseOrdersPage() {
  await requireSession();
  const pos = await prisma.purchaseOrder.findMany({ orderBy: { number: "desc" }, take: 200, include: { lines: true } });

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 900 }}>
      <p><a href="/">&larr; Home</a></p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Purchase Orders</h1>
        <a href="/purchase-orders/new" style={{ padding: "0.55rem 1rem", background: "#1a1a1a", color: "#fff", borderRadius: 6, textDecoration: "none" }}>
          + New PO
        </a>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
        <thead>
          <tr>
            <th style={th}>#</th>
            <th style={th}>Date</th>
            <th style={th}>Vendor</th>
            <th style={th}>Status</th>
            <th style={th}>Paid</th>
            <th style={{ ...th, textAlign: "right" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {pos.map((po) => (
            <tr key={po.id}>
              <td style={td}><a href={`/purchase-orders/${po.id}`}>{po.number}</a></td>
              <td style={td}>{new Date(po.date).toLocaleDateString()}</td>
              <td style={td}>{po.vendorName}</td>
              <td style={td}>{STATUS_LABEL[po.status]}</td>
              <td style={td}>{po.paid ? "Yes" : "No"}</td>
              <td style={{ ...td, textAlign: "right" }}>${poTotal(po.lines).toFixed(2)}</td>
            </tr>
          ))}
          {pos.length === 0 && (
            <tr>
              <td style={td} colSpan={6}>No purchase orders yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
