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
      <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 600 }}>
        <p><Link href="/payments">&larr; Back to Payments</Link></p>
        <h1>Record a Payment</h1>
        <form method="GET" style={{ display: "flex", gap: "0.75rem" }}>
          <select name="customerId" style={{ padding: "0.5rem", flex: 1 }}>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{displayName(c)}</option>
            ))}
          </select>
          <button type="submit" className="btn btn-sm">Go</button>
        </form>
      </main>
    );
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    return (
      <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem" }}>
        <p>That customer no longer exists. <Link href="/payments/new">Choose another</Link>.</p>
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
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 680 }}>
      <p><Link href="/payments">&larr; Back to Payments</Link></p>
      <h1>Record a Payment — {displayName(customer)}</h1>
      <PaymentForm
        customer={{ id: customer.id, balance: Number(customer.balance) }}
        openInvoices={openInvoices}
        creditAvailable={creditAvailable}
        creditSources={creditSources}
      />
    </main>
  );
}
