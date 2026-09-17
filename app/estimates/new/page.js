import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { displayName } from "@/lib/customers";
import EstimateForm from "../EstimateForm";

export const dynamic = "force-dynamic";

export default async function NewEstimatePage({ searchParams }) {
  await requireSession();
  const params = await searchParams;
  const customerId = params?.customerId;

  const items = await prisma.item.findMany({ orderBy: { name: "asc" } });
  const plainItems = items.map((i) => ({ id: i.id, sku: i.sku, name: i.name, price: Number(i.price), stock: i.stock }));

  if (!customerId) {
    const customers = await prisma.customer.findMany({ orderBy: [{ company: "asc" }, { lastName: "asc" }] });
    return (
      <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 600 }}>
        <p><Link href="/estimates">&larr; Back to Estimates</Link></p>
        <h1>New Estimate</h1>
        {customers.length === 0 ? (
          <p>You need at least one customer first. <Link href="/customers/new">Add a customer</Link>.</p>
        ) : (
          <form method="GET" style={{ display: "flex", gap: "0.75rem" }}>
            <select name="customerId" style={{ padding: "0.5rem", flex: 1 }}>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{displayName(c)}</option>
              ))}
            </select>
            <button type="submit" style={{ padding: "0.5rem 1rem", cursor: "pointer" }}>Go</button>
          </form>
        )}
      </main>
    );
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    return (
      <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem" }}>
        <p>That customer no longer exists. <Link href="/estimates/new">Choose another</Link>.</p>
      </main>
    );
  }

  if (plainItems.length === 0) {
    return (
      <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem" }}>
        <p>You need at least one item first. <Link href="/items/new">Add an item</Link>.</p>
      </main>
    );
  }

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 800 }}>
      <p><Link href="/estimates">&larr; Back to Estimates</Link></p>
      <h1>New Estimate</h1>
      <EstimateForm items={plainItems} customer={{ id: customer.id, name: displayName(customer), taxExempt: customer.taxExempt }} />
    </main>
  );
}
