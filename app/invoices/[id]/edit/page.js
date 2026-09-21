import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { displayName } from "@/lib/customers";
import NewInvoiceForm from "../../NewInvoiceForm";

export const dynamic = "force-dynamic";

export default async function EditInvoiceDraftPage({ params }) {
  await requireSession();
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({ where: { id }, include: { lines: true } });
  if (!invoice) notFound();

  if (invoice.status !== "DRAFT") {
    return (
      <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
        <p className="text-sm">
          This invoice is already closed and can&apos;t be edited.{" "}
          <Link href={`/invoices/${id}`} className="underline" style={{ color: "var(--deep)" }}>View it</Link>.
        </p>
      </main>
    );
  }

  const [items, customers] = await Promise.all([
    prisma.item.findMany({ orderBy: { name: "asc" } }),
    prisma.customer.findMany({ orderBy: [{ company: "asc" }, { lastName: "asc" }] }),
  ]);

  const plainItems = items.map((i) => ({ id: i.id, sku: i.sku, name: i.name, price: Number(i.price), stock: i.stock }));
  const plainCustomers = customers.map((c) => ({ id: c.id, name: displayName(c), isWalkIn: c.isWalkIn, taxExempt: c.taxExempt }));
  const initialLines = invoice.lines.map((l) => ({
    itemId: l.itemId,
    qty: l.qty,
    discountPct: Number(l.discountPct),
    note: l.note || "",
  }));

  return (
    <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
      <p className="mb-3">
        <Link href="/invoices" className="text-sm" style={{ color: "var(--faint)" }}>&larr; Back to Invoices</Link>
      </p>
      <div className="mb-5">
        <div className="eyebrow mb-1">Counter Sale</div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>Draft Invoice #{invoice.number}</h1>
      </div>
      <NewInvoiceForm
        items={plainItems}
        customers={plainCustomers}
        invoiceId={invoice.id}
        initialCustomerId={invoice.customerId}
        initialLines={initialLines}
        initialSaleType={invoice.saleType}
        initialCustomerPO={invoice.customerPO || ""}
        initialShipVia={invoice.shipVia || ""}
        initialTrackingNumber={invoice.trackingNumber || ""}
        initialNotes={invoice.notes || ""}
        initialShippingCharge={String(Number(invoice.shippingCharge))}
        initialDueDate={invoice.dueDate ? invoice.dueDate.toISOString().slice(0, 10) : ""}
      />
    </main>
  );
}
