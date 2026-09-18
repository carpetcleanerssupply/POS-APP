import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { isOwnerManager } from "@/lib/authz";
import { poTotal } from "@/lib/purchaseOrders";
import { buildMailtoUrl } from "@/lib/mailto";
import { COMPANY } from "@/lib/company";
import PODetailActions from "../PODetailActions";
import PrintButton from "../../PrintButton";
import EmailButton from "../../EmailButton";

const td = { padding: "0.4rem 0.6rem", borderBottom: "1px solid #eee" };
const th = { textAlign: "left", padding: "0.4rem 0.6rem", borderBottom: "2px solid #ddd", fontSize: "0.85rem" };

const STATUS_LABEL = { DRAFT: "Draft", ORDERED: "Ordered", PARTIAL: "Partially Received", RECEIVED: "Received" };

export const dynamic = "force-dynamic";

export default async function PurchaseOrderDetailPage({ params }) {
  const session = await requireSession();
  const { id } = await params;

  const po = await prisma.purchaseOrder.findUnique({ where: { id }, include: { lines: true, vendor: true } });
  if (!po) notFound();

  const total = poTotal(po.lines);
  const plainLines = po.lines.map((l) => ({ ...l, cost: Number(l.cost) }));

  const emailBodyLines = [
    `Purchase Order #${po.number} from ${COMPANY.name}`,
    `Date: ${new Date(po.date).toLocaleDateString()}`,
    `Vendor: ${po.vendorName || "—"}`,
    "",
    ...po.lines.map((l) => `${l.sku} — ${l.name} — Qty ${l.qtyOrdered} @ $${Number(l.cost).toFixed(2)} = $${(l.qtyOrdered * Number(l.cost)).toFixed(2)}`),
    "",
    `PO Total: $${total.toFixed(2)}`,
    ...(po.notes ? ["", `Notes: ${po.notes}`] : []),
    "",
    `Please confirm receipt of this order.`,
  ];
  const emailMailto = buildMailtoUrl({
    to: [po.vendor?.email, po.vendor?.email2].filter(Boolean).join(","),
    subject: `Purchase Order #${po.number} from ${COMPANY.name}`,
    body: emailBodyLines.join("\n"),
  });

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 760 }}>
      <p className="no-print"><Link href="/purchase-orders">&larr; Back to Purchase Orders</Link></p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>PO #{po.number}</h1>
        <span style={{ padding: "0.3rem 0.7rem", borderRadius: 6, background: "#eee", fontWeight: 600, fontSize: "0.85rem" }}>
          {STATUS_LABEL[po.status]}{po.paid ? ` · Paid${po.checkNumber ? ` (check #${po.checkNumber})` : ""}` : ""}
        </span>
      </div>

      <p style={{ color: "#555" }}>{po.vendorName} &middot; {new Date(po.date).toLocaleDateString()}</p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
        <thead>
          <tr>
            <th style={th}>SKU</th>
            <th style={th}>Item</th>
            <th style={th}>Ordered</th>
            <th style={th}>= Pieces</th>
            <th style={th}>Received</th>
            <th style={th}>Cost</th>
            <th style={{ ...th, textAlign: "right" }}>Ext</th>
          </tr>
        </thead>
        <tbody>
          {plainLines.map((l) => (
            <tr key={l.id}>
              <td style={td}>{l.sku}</td>
              <td style={td}>{l.name}</td>
              <td style={td}>{l.qtyOrdered}</td>
              <td style={td}>{l.qtyOrdered * (l.caseQty || 1)}</td>
              <td style={td}>{l.qtyReceived}</td>
              <td style={td}>${l.cost.toFixed(2)}</td>
              <td style={{ ...td, textAlign: "right" }}>${(l.qtyOrdered * l.cost).toFixed(2)}</td>
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

      <p className="no-print" style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
        <PrintButton />
        <EmailButton mailtoUrl={emailMailto} />
      </p>

      <div className="no-print">
        <PODetailActions
          po={{ id: po.id, status: po.status, paid: po.paid, checkNumber: po.checkNumber }}
          lines={plainLines}
          canUnmarkPaid={isOwnerManager(session)}
        />
      </div>
    </main>
  );
}
