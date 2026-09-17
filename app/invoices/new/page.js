import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { displayName } from "@/lib/customers";
import NewInvoiceForm from "../NewInvoiceForm";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  await requireSession();

  const [items, customers] = await Promise.all([
    prisma.item.findMany({ orderBy: { name: "asc" } }),
    prisma.customer.findMany({ orderBy: [{ company: "asc" }, { lastName: "asc" }] }),
  ]);

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
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 800 }}>
      <p><a href="/invoices">&larr; Back to Invoices</a></p>
      <h1>New Invoice</h1>
      {plainCustomers.length === 0 ? (
        <p>
          You need at least one customer before creating an invoice.{" "}
          <a href="/customers/new">Add a customer</a> first.
        </p>
      ) : plainItems.length === 0 ? (
        <p>
          You need at least one item before creating an invoice.{" "}
          <a href="/items/new">Add an item</a> first.
        </p>
      ) : (
        <NewInvoiceForm items={plainItems} customers={plainCustomers} />
      )}
    </main>
  );
}
