import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { displayName } from "@/lib/customers";
import { buildCreditLedger } from "@/lib/creditLedger";
import PaymentForm from "../PaymentForm";

export const dynamic = "force-dynamic";

export default async function NewPaymentPage({ searchParams }) {
  await requireSession();
  const params = await searchParams;
  const customerId = params?.customerId;

  if (!customerId) {
    const customers = await prisma.customer.findMany({ orderBy: [{ company: "asc" }, { lastName: "asc" }] });
    return (
      <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
        <p className="mb-3">
          <Link href="/payments" className="text-sm" style={{ color: "var(--faint)" }}>&larr; Back to Payments</Link>
        </p>
        <div className="mb-5">
          <div className="eyebrow mb-1">Accounts Receivable</div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>Record a Payment</h1>
        </div>
        <form method="GET" className="card p-5 flex gap-3" style={{ maxWidth: 640 }}>
          <select name="customerId" className="px-3 py-2 rounded border text-sm hairline" style={{ backgroundColor: "var(--panel)", flex: 1 }}>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{displayName(c)}</option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary">Go</button>
        </form>
      </main>
    );
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    return (
      <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
        <p className="text-sm">
          That customer no longer exists. <Link href="/payments/new" className="underline" style={{ color: "var(--deep)" }}>Choose another</Link>.
        </p>
      </main>
    );
  }

  const [openInvoicesRaw, allPayments] = await Promise.all([
    prisma.invoice.findMany({ where: { customerId, status: "CLOSED", settledTo: "ACCOUNT" }, orderBy: { date: "asc" } }),
    prisma.payment.findMany({ where: { customerId } }),
  ]);

  const openInvoices = openInvoicesRaw
    .map((inv) => ({
      id: inv.id,
      number: inv.number,
      date: inv.date,
      total: Number(inv.total),
      owed: Number(inv.total) - Number(inv.paidAmount),
    }))
    .filter((inv) => inv.owed > 0.005);

  const creditSources = buildCreditLedger(allPayments);
  const creditAvailable = creditSources.reduce((sum, s) => sum + s.remaining, 0);

  return (
    <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
      <p className="mb-3">
        <Link href="/payments" className="text-sm" style={{ color: "var(--faint)" }}>&larr; Back to Payments</Link>
      </p>
      <div className="mb-5">
        <div className="eyebrow mb-1">Accounts Receivable</div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>Record a Payment — {displayName(customer)}</h1>
      </div>
      <PaymentForm
        customer={{ id: customer.id, balance: Number(customer.balance) }}
        openInvoices={openInvoices}
        creditAvailable={creditAvailable}
        creditSources={creditSources}
      />
    </main>
  );
}
