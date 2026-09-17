import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { buildMailtoUrl } from "@/lib/mailto";
import { COMPANY } from "@/lib/company";
import PrintButton from "../../PrintButton";
import EmailButton from "../../EmailButton";

const td = { padding: "0.4rem 0.6rem", borderBottom: "1px solid #eee" };
const th = { textAlign: "left", padding: "0.4rem 0.6rem", borderBottom: "2px solid #ddd", fontSize: "0.85rem" };

export default async function EstimateDetailPage({ params }) {
  await requireSession();
  const { id } = await params;

  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: { lines: true, convertedInvoice: true },
  });
  if (!estimate) notFound();

  const isConverted = estimate.status === "CONVERTED";
  const totalDiscount = estimate.lines.reduce((sum, l) => sum + (Number(l.price) * l.qty - Number(l.ext)), 0);

  const emailBodyLines = [
    `Estimate #${estimate.number} from ${COMPANY.name}`,
    `Date: ${new Date(estimate.date).toLocaleDateString()}`,
    ...(estimate.expirationDate ? [`Valid Until: ${new Date(estimate.expirationDate).toLocaleDateString()}`] : []),
    `Customer: ${estimate.customerName}`,
    "",
    ...estimate.lines.map(
      (l) =>
        `${l.qty} x ${l.name} (${l.sku}) @ $${Number(l.price).toFixed(2)}${Number(l.discountPct) > 0 ? ` (-${l.discountPct}%)` : ""} = $${Number(l.ext).toFixed(2)}`
    ),
    "",
    `Subtotal: $${Number(estimate.subtotal).toFixed(2)}`,
    ...(Number(estimate.shippingCharge) > 0 ? [`Shipping: $${Number(estimate.shippingCharge).toFixed(2)}`] : []),
    `Total: $${Number(estimate.total).toFixed(2)}`,
    ...(totalDiscount > 0.005 ? [`(Includes $${totalDiscount.toFixed(2)} in item discounts.)`] : []),
    ...(estimate.notes ? ["", `Notes: ${estimate.notes}`] : []),
    ...(estimate.expirationDate
      ? ["", `This estimate is valid until ${new Date(estimate.expirationDate).toLocaleDateString()}.`]
      : []),
  ];
  const emailMailto = buildMailtoUrl({
    to: [estimate.customerEmail, estimate.customerEmail2].filter(Boolean).join(","),
    subject: `Estimate from ${COMPANY.name}`,
    body: emailBodyLines.join("\n"),
  });

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 760 }}>
      <p className="no-print"><a href="/estimates">&larr; Back to Estimates</a></p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>Estimate #{estimate.number}</h1>
        <span
          style={{
            padding: "0.3rem 0.7rem",
            borderRadius: 6,
            background: isConverted ? "#e8f5e9" : "#fff3e0",
            color: isConverted ? "#2e7d32" : "#e65100",
            fontWeight: 600,
            fontSize: "0.85rem",
          }}
        >
          {isConverted ? "Converted" : "Open"}
        </span>
      </div>

      <p style={{ color: "#555" }}>
        {new Date(estimate.date).toLocaleDateString()}
        {estimate.expirationDate && ` · Valid until ${new Date(estimate.expirationDate).toLocaleDateString()}`}
      </p>

      <h3>{estimate.customerName}</h3>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
        <thead>
          <tr>
            <th style={th}>SKU</th>
            <th style={th}>Item</th>
            <th style={th}>Qty</th>
            <th style={th}>Price</th>
            <th style={th}>Disc</th>
            <th style={{ ...th, textAlign: "right" }}>Ext</th>
          </tr>
        </thead>
        <tbody>
          {estimate.lines.map((l) => (
            <tr key={l.id}>
              <td style={td}>{l.sku}</td>
              <td style={td}>{l.name}</td>
              <td style={td}>{l.qty}</td>
              <td style={td}>${Number(l.price).toFixed(2)}</td>
              <td style={td}>{Number(l.discountPct) > 0 ? `${l.discountPct}%` : "—"}</td>
              <td style={{ ...td, textAlign: "right" }}>${Number(l.ext).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ textAlign: "right", marginTop: "1rem" }}>
        <div>Subtotal: ${Number(estimate.subtotal).toFixed(2)}</div>
        {Number(estimate.shippingCharge) > 0 && <div>Shipping: ${Number(estimate.shippingCharge).toFixed(2)}</div>}
        {Number(estimate.tax) > 0 && <div>Tax: ${Number(estimate.tax).toFixed(2)}</div>}
        <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>Total: ${Number(estimate.total).toFixed(2)}</div>
      </div>

      {estimate.notes && (
        <p style={{ marginTop: "1rem" }}>
          <strong>Notes:</strong> {estimate.notes}
        </p>
      )}

      <p className="no-print" style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
        <PrintButton />
        <EmailButton mailtoUrl={emailMailto} />
        {isConverted ? (
          estimate.convertedInvoice && (
            <a href={`/invoices/${estimate.convertedInvoice.id}`}>View Invoice #{estimate.convertedInvoice.number}</a>
          )
        ) : (
          <>
            <a href={`/invoices/new?estimateId=${estimate.id}`}>Convert to Invoice</a>
            <a href={`/estimates/${estimate.id}/edit`}>Edit</a>
          </>
        )}
      </p>
    </main>
  );
}
