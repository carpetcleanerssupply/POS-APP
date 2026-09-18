import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { formatAddress } from "@/lib/customers";
import { paymentMethodLabel } from "@/lib/payments";
import { buildMailtoUrl } from "@/lib/mailto";
import { COMPANY } from "@/lib/company";
import DocumentLetterhead from "../../DocumentLetterhead";
import DeleteDraftButton from "../DeleteDraftButton";
import PrintButton from "../../PrintButton";
import EmailButton from "../../EmailButton";

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

  const isDraft = invoice.status === "DRAFT";
  const isAccount = invoice.settledTo === "ACCOUNT";

  const emailBodyLines = [
    `Invoice #${invoice.number} from ${COMPANY.name}`,
    ...(isDraft ? ["*** DRAFT — NOT YET FINAL ***"] : []),
    `Invoice Date: ${new Date(invoice.date).toLocaleDateString()}`,
    ...(invoice.dueDate ? [`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`] : []),
    ...(invoice.customerPO ? [`P.O. #: ${invoice.customerPO}`] : []),
    `Customer: ${invoice.customerName}`,
    `Billing: ${formatAddress(invoice.customerBillingSnapshot) || "—"}`,
    `Shipping: ${formatAddress(invoice.customerShippingSnapshot) || "—"}`,
    "",
    ...invoice.lines.map(
      (l) =>
        `${l.qty} x ${l.name} (${l.sku}) @ $${Number(l.price).toFixed(2)}${Number(l.discountPct) > 0 ? ` (-${l.discountPct}%)` : ""} = $${Number(l.ext).toFixed(2)}`
    ),
    "",
    `Subtotal: $${Number(invoice.subtotal).toFixed(2)}`,
    ...(Number(invoice.shippingCharge) > 0 ? [`Shipping: $${Number(invoice.shippingCharge).toFixed(2)}`] : []),
    ...(Number(invoice.tax) > 0 ? [`Tax: $${Number(invoice.tax).toFixed(2)}`] : []),
    `Total: $${Number(invoice.total).toFixed(2)}`,
    ...(isDraft
      ? []
      : [`Payment: ${isAccount ? "Charged to account" : paymentMethodLabel(invoice.paymentMethod, invoice.checkNumber)}`]),
    ...(invoice.notes ? ["", `Notes: ${invoice.notes}`] : []),
    "",
    `Thank you for your business — ${COMPANY.name}`,
  ];
  const emailMailto = buildMailtoUrl({
    to: [invoice.customerEmail, invoice.customerEmail2].filter(Boolean).join(","),
    subject: `Invoice #${invoice.number} from ${COMPANY.name}`,
    body: emailBodyLines.join("\n"),
  });

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 760 }}>
      <p className="no-print"><Link href="/invoices">&larr; Back to Invoices</Link></p>

      <DocumentLetterhead />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>Invoice #{invoice.number}</h1>
        <span
          style={{
            padding: "0.3rem 0.7rem",
            borderRadius: 6,
            background: isDraft ? "#eee" : isAccount ? "#fff3e0" : "#e8f5e9",
            color: isDraft ? "#555" : isAccount ? "#e65100" : "#2e7d32",
            fontWeight: 600,
            fontSize: "0.85rem",
          }}
        >
          {isDraft ? "Draft" : isAccount ? "Charged to Account" : "Paid"}
        </span>
      </div>

      {isDraft && (
        <p style={{ background: "#fff3e0", color: "#e65100", padding: "0.75rem 1rem", borderRadius: 8 }}>
          This is a draft — nothing has been charged and stock hasn&apos;t been affected yet.
        </p>
      )}

      <p style={{ color: "#555" }}>
        {new Date(invoice.date).toLocaleString()} &middot; {invoice.saleType === "WALKIN" ? "Walk-in" : "Phone"} sale
        &middot; sold by {invoice.employee?.name || "—"}
      </p>

      <h3>{invoice.customerName}</h3>
      {invoice.customer && <p className="no-print" style={{ color: "#555" }}><Link href={`/customers/${invoice.customer.id}/edit`}>View customer</Link></p>}

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

      {!isDraft && (
        <p style={{ marginTop: "1rem", color: "#555" }}>
          {isAccount
            ? "Charged to customer account."
            : `Paid via ${invoice.paymentMethod?.toLowerCase()}${invoice.checkNumber ? ` (check #${invoice.checkNumber})` : ""}.`}
        </p>
      )}

      <p className="no-print" style={{ display: "flex", gap: "1rem" }}>
        <PrintButton />
        <EmailButton mailtoUrl={emailMailto} />
        {isDraft ? (
          <>
            <Link href={`/invoices/${invoice.id}/edit`}>Edit / Close Draft</Link>
            <DeleteDraftButton invoiceId={invoice.id} />
          </>
        ) : (
          <>
            <Link href={`/returns/new?invoiceId=${invoice.id}`}>Process Return</Link>
            {isAccount && <Link href={`/payments/new?customerId=${invoice.customerId}`}>Record Payment</Link>}
          </>
        )}
      </p>

      {invoice.notes && (
        <p style={{ marginTop: "1rem" }}>
          <strong>Notes:</strong> {invoice.notes}
        </p>
      )}
    </main>
  );
}
