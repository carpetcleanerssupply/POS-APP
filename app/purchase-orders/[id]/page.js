import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { isOwnerManager } from "@/lib/authz";
import { poTotal } from "@/lib/purchaseOrders";
import { buildMailtoUrl } from "@/lib/mailto";
import { COMPANY } from "@/lib/company";
import DocumentLetterhead from "../../DocumentLetterhead";
import PODetailActions from "../PODetailActions";
import PrintButton from "../../PrintButton";
import EmailButton from "../../EmailButton";

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
    <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
      <p className="no-print mb-3">
        <Link href="/purchase-orders" className="text-sm" style={{ color: "var(--faint)" }}>&larr; Back to Purchase Orders</Link>
      </p>

      <DocumentLetterhead />

      <div className="flex justify-between items-baseline mt-4">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>PO #{po.number}</h1>
        <span className="px-3 py-1 rounded-md font-semibold text-xs" style={{ backgroundColor: "var(--paper)", color: "var(--ink)" }}>
          {STATUS_LABEL[po.status]}{po.paid ? ` · Paid${po.checkNumber ? ` (check #${po.checkNumber})` : ""}` : ""}
        </span>
      </div>

      <p className="text-sm mt-1" style={{ color: "var(--faint)" }}>{po.vendorName} &middot; {new Date(po.date).toLocaleDateString()}</p>

      <div className="card overflow-hidden mt-4">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: "var(--paper)" }}>
              <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wide" style={{ color: "var(--faint)" }}>SKU</th>
              <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wide" style={{ color: "var(--faint)" }}>Item</th>
              <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wide" style={{ color: "var(--faint)" }}>Ordered</th>
              <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wide" style={{ color: "var(--faint)" }}>= Pieces</th>
              <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wide" style={{ color: "var(--faint)" }}>Received</th>
              <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wide" style={{ color: "var(--faint)" }}>Cost</th>
              <th className="px-3 py-2 text-right font-medium text-xs uppercase tracking-wide" style={{ color: "var(--faint)" }}>Ext</th>
            </tr>
          </thead>
          <tbody>
            {plainLines.map((l) => (
              <tr key={l.id}>
                <td className="px-3 py-2 border-t hairline mono" style={{ color: "var(--faint)" }}>{l.sku}</td>
                <td className="px-3 py-2 border-t hairline">{l.name}</td>
                <td className="px-3 py-2 border-t hairline">{l.qtyOrdered}</td>
                <td className="px-3 py-2 border-t hairline">{l.qtyOrdered * (l.caseQty || 1)}</td>
                <td className="px-3 py-2 border-t hairline">{l.qtyReceived}</td>
                <td className="px-3 py-2 border-t hairline mono">${l.cost.toFixed(2)}</td>
                <td className="px-3 py-2 border-t hairline text-right mono font-medium">${(l.qtyOrdered * l.cost).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-right mt-3 font-semibold text-lg mono" style={{ color: "var(--deep)" }}>
        PO Total: ${total.toFixed(2)}
      </div>

      {po.notes && (
        <p className="text-sm mt-4">
          <strong>Notes:</strong> {po.notes}
        </p>
      )}

      <p className="no-print flex gap-3 mt-4">
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
