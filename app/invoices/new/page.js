import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { displayName } from "@/lib/customers";
import NewInvoiceForm from "../NewInvoiceForm";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({ searchParams }) {
  await requireSession();
  const params = await searchParams;
  const estimateId = params?.estimateId || null;

  const [items, customers, estimate] = await Promise.all([
    prisma.item.findMany({ orderBy: { name: "asc" } }),
    prisma.customer.findMany({ orderBy: [{ company: "asc" }, { lastName: "asc" }] }),
    estimateId ? prisma.estimate.findUnique({ where: { id: estimateId }, include: { lines: true } }) : null,
  ]);

  if (estimateId && (!estimate || estimate.status !== "OPEN")) {
    return (
      <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
        <p className="text-sm">
          That estimate isn&apos;t available to convert.{" "}
          <Link href="/invoices/new" className="underline" style={{ color: "var(--deep)" }}>Start a blank invoice</Link>.
        </p>
      </main>
    );
  }

  const plainItems = items.map((i) => ({
    id: i.id,
    sku: i.sku,
    name: i.name,
    price: Number(i.price),
    stock: i.stock,
  }));

  const plainCustomers = customers.map((c) => ({
    id: c.id,
    name: displayName(c),
    isWalkIn: c.isWalkIn,
    taxExempt: c.taxExempt,
  }));

  return (
    <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
      <p className="mb-3">
        <Link href="/invoices" className="text-sm" style={{ color: "var(--faint)" }}>&larr; Back to Invoices</Link>
      </p>
      <div className="mb-5">
        <div className="eyebrow mb-1">Counter Sale</div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>New Invoice</h1>
      </div>
      {plainCustomers.length === 0 ? (
        <p className="text-sm">
          You need at least one customer before creating an invoice.{" "}
          <Link href="/customers/new" className="underline" style={{ color: "var(--deep)" }}>Add a customer</Link> first.
        </p>
      ) : plainItems.length === 0 ? (
        <p className="text-sm">
          You need at least one item before creating an invoice.{" "}
          <Link href="/items/new" className="underline" style={{ color: "var(--deep)" }}>Add an item</Link> first.
        </p>
      ) : (
        <NewInvoiceForm
          items={plainItems}
          customers={plainCustomers}
          estimateId={estimate?.id || null}
          initialCustomerId={estimate?.customerId || null}
          initialLines={
            estimate
              ? estimate.lines.map((l) => ({ itemId: l.itemId, qty: l.qty, discountPct: Number(l.discountPct), note: l.note || "" }))
              : []
          }
        />
      )}
    </main>
  );
}
