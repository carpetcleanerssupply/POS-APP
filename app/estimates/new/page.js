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
      <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
        <p className="mb-3">
          <Link href="/estimates" className="text-sm" style={{ color: "var(--faint)" }}>&larr; Back to Estimates</Link>
        </p>
        <div className="mb-5">
          <div className="eyebrow mb-1">Estimates</div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>New Estimate</h1>
        </div>
        {customers.length === 0 ? (
          <p className="text-sm">You need at least one customer first. <Link href="/customers/new" className="underline" style={{ color: "var(--deep)" }}>Add a customer</Link>.</p>
        ) : (
          <form method="GET" className="card p-5 flex gap-3" style={{ maxWidth: 640 }}>
            <select name="customerId" className="px-3 py-2 rounded border text-sm hairline" style={{ backgroundColor: "var(--panel)", flex: 1 }}>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{displayName(c)}</option>
              ))}
            </select>
            <button type="submit" className="btn btn-primary">Go</button>
          </form>
        )}
      </main>
    );
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    return (
      <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
        <p className="text-sm">
          That customer no longer exists. <Link href="/estimates/new" className="underline" style={{ color: "var(--deep)" }}>Choose another</Link>.
        </p>
      </main>
    );
  }

  if (plainItems.length === 0) {
    return (
      <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
        <p className="text-sm">You need at least one item first. <Link href="/items/new" className="underline" style={{ color: "var(--deep)" }}>Add an item</Link>.</p>
      </main>
    );
  }

  return (
    <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
      <p className="mb-3">
        <Link href="/estimates" className="text-sm" style={{ color: "var(--faint)" }}>&larr; Back to Estimates</Link>
      </p>
      <div className="mb-5">
        <div className="eyebrow mb-1">Estimates</div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>New Estimate</h1>
      </div>
      <EstimateForm items={plainItems} customer={{ id: customer.id, name: displayName(customer), taxExempt: customer.taxExempt }} />
    </main>
  );
}
