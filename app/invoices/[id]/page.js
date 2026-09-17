import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

const td = { padding: "0.4rem 0.6rem", borderBottom: "1px solid #eee" };
const th = { textAlign: "left", padding: "0.4rem 0.6rem", borderBottom: "2px solid #ddd", fontSize: "0.85rem" };

export default async function InvoiceDetailPage({ params }) {
  await requireSession();
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { lines: true, employee: true, createdBy: true, customer: true },
  });
  if (!invoice) notFound();

  const isAccount = invoice.settledTo === "ACCOUNT";

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 760 }}>
      <p><a href="/invoices">&larr; Back to Invoices</a></p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>Invoice #{invoice.number}</h1>
        <span
          style={{
            padding: "0.3rem 0.7rem",
            borderRadius: 6,
            background: isAccount ? "#fff3e0" : "#e8f5e9",
            color: isAccount ? "#e65100" : "#2e7d32",
            fontWeight: 600,
            fontSize: "0.85rem",
          }}
        >
          {isAccount ? "Charged to Account" : "Paid"}
        </span>
      </div>

      <p style={{ color: "#555" }}>
        {new Date(invoice.date).toLocaleString()} &middot; {invoice.saleType === "WALKIN" ? "Walk-in" : "Phone"} sale
        &middot; sold by {invoice.employee?.name || "—"}
      </p>

      <h3>{invoice.customerName}</h3>
      {invoice.customer && <p style={{ color: "#555" }}><a href={`/customers/${invoice.customer.id}/edit`}>View customer</a></p>}

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
          {invoice.lines.map((l) => (
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
        <div>Subtotal: ${Number(invoice.subtotal).toFixed(2)}</div>
        {Number(invoice.shippingCharge) > 0 && <div>Shipping: ${Number(invoice.shippingCharge).toFixed(2)}</div>}
        {Number(invoice.tax) > 0 && <div>Tax: ${Number(invoice.tax).toFixed(2)}</div>}
        <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>Total: ${Number(invoice.total).toFixed(2)}</div>
      </div>

      <p style={{ marginTop: "1rem", color: "#555" }}>
        {isAccount
          ? "Charged to customer account."
          : `Paid via ${invoice.paymentMethod?.toLowerCase()}${invoice.checkNumber ? ` (check #${invoice.checkNumber})` : ""}.`}
      </p>

      {invoice.notes && (
        <p style={{ marginTop: "1rem" }}>
          <strong>Notes:</strong> {invoice.notes}
        </p>
      )}
    </main>
  );
}
