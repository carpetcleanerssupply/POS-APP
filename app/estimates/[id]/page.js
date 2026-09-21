import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { buildMailtoUrl } from "@/lib/mailto";
import { COMPANY } from "@/lib/company";
import DocumentLetterhead from "../../DocumentLetterhead";
import PrintButton from "../../PrintButton";
import EmailButton from "../../EmailButton";

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
    <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
      <p className="no-print mb-3">
        <Link href="/estimates" className="text-sm" style={{ color: "var(--faint)" }}>&larr; Back to Estimates</Link>
      </p>

      <DocumentLetterhead />

      <div className="flex justify-between items-baseline mt-4">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>Estimate #{estimate.number}</h1>
        <span
          className="px-3 py-1 rounded-md font-semibold text-xs"
          style={{
            backgroundColor: isConverted ? "var(--moss-bg)" : "#FBF0DA",
            color: isConverted ? "var(--moss)" : "var(--amber-dark)",
          }}
        >
          {isConverted ? "Converted" : "Open"}
        </span>
      </div>

      <p className="text-sm mt-1" style={{ color: "var(--faint)" }}>
        {new Date(estimate.date).toLocaleDateString()}
        {estimate.expirationDate && ` · Valid until ${new Date(estimate.expirationDate).toLocaleDateString()}`}
      </p>

      <h3 className="text-base font-semibold mt-3" style={{ color: "var(--ink)" }}>{estimate.customerName}</h3>

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
            {estimate.lines.map((l) => (
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
        <div style={{ color: "var(--faint)" }}>Subtotal: ${Number(estimate.subtotal).toFixed(2)}</div>
        {Number(estimate.shippingCharge) > 0 && <div style={{ color: "var(--faint)" }}>Shipping: ${Number(estimate.shippingCharge).toFixed(2)}</div>}
        {Number(estimate.tax) > 0 && <div style={{ color: "var(--faint)" }}>Tax: ${Number(estimate.tax).toFixed(2)}</div>}
        <div className="font-semibold text-lg mono mt-1" style={{ color: "var(--deep)" }}>Total: ${Number(estimate.total).toFixed(2)}</div>
      </div>

      {estimate.notes && (
        <p className="text-sm mt-4">
          <strong>Notes:</strong> {estimate.notes}
        </p>
      )}

      <p className="no-print flex gap-4 mt-5 items-center flex-wrap">
        <PrintButton />
        <EmailButton mailtoUrl={emailMailto} />
        {isConverted ? (
          estimate.convertedInvoice && (
            <Link href={`/invoices/${estimate.convertedInvoice.id}`} className="text-sm font-semibold" style={{ color: "var(--deep)" }}>
              View Invoice #{estimate.convertedInvoice.number}
            </Link>
          )
        ) : (
          <>
            <Link href={`/invoices/new?estimateId=${estimate.id}`} className="text-sm font-semibold" style={{ color: "var(--deep)" }}>
              Convert to Invoice
            </Link>
            <Link href={`/estimates/${estimate.id}/edit`} className="text-sm font-semibold" style={{ color: "var(--deep)" }}>
              Edit
            </Link>
          </>
        )}
      </p>
    </main>
  );
}
