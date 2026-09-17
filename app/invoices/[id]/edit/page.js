import { notFound } from "next/navigation";
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
      <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem" }}>
        <p>
          This invoice is already closed and can&apos;t be edited.{" "}
          <a href={`/invoices/${id}`}>View it</a>.
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
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 800 }}>
      <p><a href="/invoices">&larr; Back to Invoices</a></p>
      <h1>Draft Invoice #{invoice.number}</h1>
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
