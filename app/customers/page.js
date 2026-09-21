import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { displayName, contactName } from "@/lib/customers";
import { buildStatementLedger } from "@/lib/statement";
import CustomerSearchList from "./CustomerSearchList";
import CustomerDetailCard from "./CustomerDetailCard";

const DELETE_ERROR_MESSAGES = {
  has_balance: () => "Can't delete — this customer has a balance on their account. Settle it first before deleting.",
  has_history: (params) =>
    `Can't delete — this customer has ${params.invoices} invoice(s) and ${params.estimates} estimate(s) on file. Deleting would orphan that history.`,
  not_found: () => "That customer no longer exists.",
};

function serializeCustomer(c) {
  return { ...c, balance: Number(c.balance) };
}

function isFormError(error) {
  return error === "required";
}

export default async function CustomersPage({ searchParams }) {
  await requireSession();
  const params = await searchParams;
  const selectedId = params?.selected || null;

  const allCustomers = await prisma.customer.findMany({ orderBy: [{ company: "asc" }, { lastName: "asc" }] });

  const searchList = allCustomers.map((c) => ({
    id: c.id,
    name: displayName(c),
    subtitle: (c.company && contactName(c)) ? contactName(c) : (c.workPhone || c.cellPhone || c.email || "No contact info"),
    balance: Number(c.balance),
    searchText: [displayName(c), c.email, c.workPhone, c.cellPhone].filter(Boolean).join(" ").toLowerCase(),
  }));

  const errorMessage = params?.error && DELETE_ERROR_MESSAGES[params.error]?.(params);

  const selectedRaw = selectedId ? allCustomers.find((c) => c.id === selectedId) : null;
  const selectedCustomer = selectedRaw ? serializeCustomer(selectedRaw) : null;

  let ledger = [];
  if (selectedCustomer) {
    const [invoices, payments, returns, estimates] = await Promise.all([
      prisma.invoice.findMany({ where: { customerId: selectedId } }),
      prisma.payment.findMany({ where: { customerId: selectedId }, include: { applications: true } }),
      prisma.return.findMany({ where: { customerId: selectedId } }),
      prisma.estimate.findMany({ where: { customerId: selectedId } }),
    ]);
    ledger = buildStatementLedger({ invoices, payments, returns, estimates });
  }

  return (
    <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
      <p className="mb-3">
        <Link href="/" className="text-sm" style={{ color: "var(--faint)" }}>&larr; Home</Link>
      </p>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <div>
          <div className="eyebrow mb-1">Customer Database</div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>
            Customers ({allCustomers.length})
          </h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/api/customers/export" className="btn">Export CSV</Link>
          <Link href="/api/customers/mailing-list" className="btn">Export Mailing List</Link>
          <Link href="/customers/import" className="btn">Import CSV</Link>
          <Link href="/customers/new" className="btn btn-primary">+ New Customer</Link>
        </div>
      </div>

      {errorMessage && (
        <p className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ color: "var(--rust)", backgroundColor: "var(--rust-bg)" }}>
          {errorMessage}
        </p>
      )}
      {params?.saved === "1" && (
        <p className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ color: "var(--moss)", backgroundColor: "var(--moss-bg)" }}>
          Customer saved.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <CustomerSearchList customers={searchList} selectedId={selectedId} />

        <div>
          {selectedCustomer ? (
            <div className="flex flex-col gap-4">
              <CustomerDetailCard
                customer={selectedCustomer}
                initialEditMode={params?.edit === "1"}
                error={params?.error && isFormError(params.error) ? params.error : undefined}
              />

              <div className="card p-5">
                <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                  <div className="eyebrow">Account History</div>
                  <div className="flex items-center gap-2">
                    <Link href={`/customers/${selectedCustomer.id}/statement`} className="btn btn-sm">Print Statement</Link>
                    <Link href={`/customers/${selectedCustomer.id}/statement`} className="btn btn-sm">Email Statement</Link>
                    <Link href={`/payments/new?customerId=${selectedCustomer.id}`} className="btn btn-sm btn-primary">
                      Record Payment →
                    </Link>
                  </div>
                </div>

                {ledger.length === 0 ? (
                  <div className="text-sm" style={{ color: "var(--faint)" }}>No activity on file yet for this customer.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide" style={{ color: "var(--faint)" }}>
                        <th className="pb-2 font-medium">Date</th>
                        <th className="pb-2 font-medium">Description</th>
                        <th className="pb-2 font-medium text-right">Amount</th>
                        <th className="pb-2 font-medium text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.map((e) => (
                        <tr key={e.key} className="border-t hairline">
                          <td className="py-2 whitespace-nowrap" style={{ color: "var(--faint)" }}>
                            {new Date(e.date).toLocaleDateString()}
                          </td>
                          <td className="py-2">{e.description}</td>
                          <td
                            className="py-2 text-right mono font-medium"
                            style={{
                              color:
                                e.displayAmount != null
                                  ? "var(--faint)"
                                  : e.amount > 0
                                  ? "var(--rust)"
                                  : e.amount < 0
                                  ? "var(--moss)"
                                  : "var(--faint)",
                            }}
                          >
                            {e.displayAmount != null
                              ? `$${e.displayAmount.toFixed(2)}`
                              : e.amount === 0
                              ? "—"
                              : e.amount > 0
                              ? `$${e.amount.toFixed(2)}`
                              : `-$${Math.abs(e.amount).toFixed(2)}`}
                          </td>
                          <td className="py-2 text-right mono" style={{ color: e.balance > 0.005 ? "var(--rust)" : "var(--moss)" }}>
                            ${e.balance.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center text-sm" style={{ color: "var(--faint)" }}>
              {allCustomers.length === 0 ? "No customers yet — add one to get started." : "Select a customer from the list."}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
