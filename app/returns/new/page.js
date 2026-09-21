import Link from "next/link";
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
      <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
        <p className="mb-3">
          <Link href="/returns" className="text-sm" style={{ color: "var(--faint)" }}>&larr; Back to Returns</Link>
        </p>
        <div className="mb-5">
          <div className="eyebrow mb-1">Returns Register</div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>Process a Return</h1>
        </div>
        <form method="GET" className="card p-5 flex gap-3" style={{ maxWidth: 480 }}>
          <input name="number" type="number" placeholder="Invoice #" className="px-3 py-2 rounded border text-sm focus-amber hairline" style={{ backgroundColor: "var(--panel)", flex: 1 }} />
          <button type="submit" className="btn btn-primary">Find</button>
        </form>
        {params?.number && (
          <p className="text-sm mt-3" style={{ color: "var(--rust)" }}>No invoice #{params.number} found.</p>
        )}
      </main>
    );
  }

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, include: { lines: true } });
  if (!invoice || invoice.status !== "CLOSED") {
    return (
      <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
        <p className="text-sm">
          That invoice isn&apos;t available to return against. <Link href="/returns/new" className="underline" style={{ color: "var(--deep)" }}>Choose another</Link>.
        </p>
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
    <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
      <p className="mb-3">
        <Link href={`/invoices/${invoice.id}`} className="text-sm" style={{ color: "var(--faint)" }}>&larr; Back to Invoice #{invoice.number}</Link>
      </p>
      <div className="mb-5">
        <div className="eyebrow mb-1">Returns Register</div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>Process a Return — Invoice #{invoice.number}</h1>
        <p className="text-sm mt-1" style={{ color: "var(--faint)" }}>{invoice.customerName}</p>
      </div>
      <ReturnForm invoiceId={invoice.id} lines={lines} />
    </main>
  );
}
