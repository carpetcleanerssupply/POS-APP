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
    <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
      <p className="no-print mb-3">
        <Link href="/invoices" className="text-sm" style={{ color: "var(--faint)" }}>&larr; Back to Invoices</Link>
      </p>

      <DocumentLetterhead />

      <div className="flex justify-between items-baseline mt-4">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>Invoice #{invoice.number}</h1>
        <span
          className="px-3 py-1 rounded-md font-semibold text-xs"
          style={{
            backgroundColor: isDraft ? "var(--paper)" : isAccount ? "#FBF0DA" : "var(--moss-bg)",
            color: isDraft ? "var(--faint)" : isAccount ? "var(--amber-dark)" : "var(--moss)",
          }}
        >
          {isDraft ? "Draft" : isAccount ? "Charged to Account" : "Paid"}
        </span>
      </div>

      {isDraft && (
        <p className="px-4 py-3 rounded-lg text-sm mt-3" style={{ backgroundColor: "#FBF0DA", color: "var(--amber-dark)" }}>
          This is a draft — nothing has been charged and stock hasn&apos;t been affected yet.
        </p>
      )}

      <p className="text-sm mt-2" style={{ color: "var(--faint)" }}>
        {new Date(invoice.date).toLocaleString()} &middot; {invoice.saleType === "WALKIN" ? "Walk-in" : "Phone"} sale
        &middot; sold by {invoice.employee?.name || "—"}
      </p>

      <h3 className="text-base font-semibold mt-3" style={{ color: "var(--ink)" }}>{invoice.customerName}</h3>
      {invoice.customer && (
        <p className="no-print text-sm mt-1">
          <Link href={`/customers?selected=${invoice.customer.id}`} className="underline" style={{ color: "var(--deep)" }}>View customer</Link>
        </p>
      )}

      <div className="card overflow-hidden mt-4">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: "var(--paper)" }}>
              <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wide" style={{ color: "var(--faint)" }}>SKU</th>
              <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wide" style={{ color: "var(--faint)" }}>Item</th>
              <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wide" style={{ color: "var(--faint)" }}>Qty</th>
              <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wide" style={{ color: "var(--faint)" }}>Price</th>
              <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wide" style={{ color: "var(--faint)" }}>Disc</th>
              <th className="px-3 py-2 text-right font-medium text-xs uppercase tracking-wide" style={{ color: "var(--faint)" }}>Ext</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((l) => (
              <tr key={l.id}>
                <td className="px-3 py-2 border-t hairline mono" style={{ color: "var(--faint)" }}>{l.sku}</td>
                <td className="px-3 py-2 border-t hairline">{l.name}</td>
                <td className="px-3 py-2 border-t hairline">{l.qty}</td>
                <td className="px-3 py-2 border-t hairline mono">${Number(l.price).toFixed(2)}</td>
                <td className="px-3 py-2 border-t hairline">{Number(l.discountPct) > 0 ? `${l.discountPct}%` : "—"}</td>
                <td className="px-3 py-2 border-t hairline text-right mono font-medium">${Number(l.ext).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-right mt-3 text-sm">
        <div style={{ color: "var(--faint)" }}>Subtotal: ${Number(invoice.subtotal).toFixed(2)}</div>
        {Number(invoice.shippingCharge) > 0 && <div style={{ color: "var(--faint)" }}>Shipping: ${Number(invoice.shippingCharge).toFixed(2)}</div>}
        {Number(invoice.tax) > 0 && <div style={{ color: "var(--faint)" }}>Tax: ${Number(invoice.tax).toFixed(2)}</div>}
        <div className="font-semibold text-lg mono mt-1" style={{ color: "var(--deep)" }}>Total: ${Number(invoice.total).toFixed(2)}</div>
      </div>

      {!isDraft && (
        <p className="text-sm mt-4" style={{ color: "var(--faint)" }}>
          {isAccount
            ? "Charged to customer account."
            : `Paid via ${invoice.paymentMethod?.toLowerCase()}${invoice.checkNumber ? ` (check #${invoice.checkNumber})` : ""}.`}
        </p>
      )}

      <p className="no-print flex gap-4 mt-5 items-center flex-wrap">
        <PrintButton />
        <EmailButton mailtoUrl={emailMailto} />
        {isDraft ? (
          <>
            <Link href={`/invoices/${invoice.id}/edit`} className="text-sm font-semibold" style={{ color: "var(--deep)" }}>
              Edit / Close Draft
            </Link>
            <DeleteDraftButton invoiceId={invoice.id} />
          </>
        ) : (
          <>
            <Link href={`/returns/new?invoiceId=${invoice.id}`} className="text-sm font-semibold" style={{ color: "var(--deep)" }}>
              Process Return
            </Link>
            {isAccount && (
              <Link href={`/payments/new?customerId=${invoice.customerId}`} className="text-sm font-semibold" style={{ color: "var(--deep)" }}>
                Record Payment
              </Link>
            )}
          </>
        )}
      </p>

      {invoice.notes && (
        <p className="text-sm mt-4">
          <strong>Notes:</strong> {invoice.notes}
        </p>
      )}
    </main>
  );
}
