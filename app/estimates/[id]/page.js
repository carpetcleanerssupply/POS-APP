import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

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

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 760 }}>
      <p><a href="/estimates">&larr; Back to Estimates</a></p>

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

      <p style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
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
