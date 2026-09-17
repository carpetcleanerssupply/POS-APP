import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import ReturnForm from "../ReturnForm";

export const dynamic = "force-dynamic";

export default async function NewReturnPage({ searchParams }) {
  await requireSession();
  const params = await searchParams;

  let invoiceId = params?.invoiceId || null;

  if (!invoiceId && params?.number) {
    const byNumber = await prisma.invoice.findUnique({ where: { number: Number(params.number) } });
    if (byNumber) invoiceId = byNumber.id;
  }

  if (!invoiceId) {
    return (
      <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 480 }}>
        <p><a href="/returns">&larr; Back to Returns</a></p>
        <h1>Process a Return</h1>
        <form method="GET" style={{ display: "flex", gap: "0.75rem" }}>
          <input name="number" type="number" placeholder="Invoice #" style={{ padding: "0.5rem", flex: 1 }} />
          <button type="submit" style={{ padding: "0.5rem 1rem", cursor: "pointer" }}>Find</button>
        </form>
        {params?.number && <p style={{ color: "#c62828" }}>No invoice #{params.number} found.</p>}
      </main>
    );
  }

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, include: { lines: true } });
  if (!invoice || invoice.status !== "CLOSED") {
    return (
      <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem" }}>
        <p>That invoice isn&apos;t available to return against. <a href="/returns/new">Choose another</a>.</p>
      </main>
    );
  }

  const priorReturns = await prisma.return.findMany({
    where: { originalInvoiceId: invoiceId, voided: false },
    include: { lines: true },
  });
  const alreadyReturned = {};
  for (const r of priorReturns) {
    for (const l of r.lines) {
      alreadyReturned[l.itemId] = (alreadyReturned[l.itemId] || 0) + l.qty;
    }
  }

  const lines = invoice.lines
    .map((l) => {
      const maxReturnable = l.qty - (alreadyReturned[l.itemId] || 0);
      const unitPrice = l.qty > 0 ? Number(l.ext) / l.qty : 0;
      return { itemId: l.itemId, sku: l.sku, name: l.name, maxReturnable, unitPrice };
    })
    .filter((l) => l.maxReturnable > 0 && l.itemId);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 680 }}>
      <p><a href={`/invoices/${invoice.id}`}>&larr; Back to Invoice #{invoice.number}</a></p>
      <h1>Process a Return — Invoice #{invoice.number}</h1>
      <p style={{ color: "#555" }}>{invoice.customerName}</p>
      <ReturnForm invoiceId={invoice.id} lines={lines} />
    </main>
  );
}
