import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { displayName } from "@/lib/customers";
import { buildStatementLedger } from "@/lib/statement";
import { buildMailtoUrl } from "@/lib/mailto";
import { COMPANY } from "@/lib/company";
import DocumentLetterhead from "../../../DocumentLetterhead";
import PrintButton from "../../../PrintButton";
import EmailButton from "../../../EmailButton";

export const dynamic = "force-dynamic";

export default async function CustomerStatementPage({ params }) {
  await requireSession();
  const { id } = await params;

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) notFound();

  const [invoices, payments, returns, estimates] = await Promise.all([
    prisma.invoice.findMany({ where: { customerId: id } }),
    prisma.payment.findMany({ where: { customerId: id }, include: { applications: true } }),
    prisma.return.findMany({ where: { customerId: id } }),
    prisma.estimate.findMany({ where: { customerId: id } }),
  ]);

  const ledger = buildStatementLedger({ invoices, payments, returns, estimates });
  const name = displayName(customer);

  const emailBodyLines = [
    `Account Statement — ${name}`,
    `As of ${new Date().toLocaleDateString()}`,
    "",
    ...ledger
      .slice()
      .reverse()
      .map((e) => {
        const amt =
          e.displayAmount != null
            ? `$${e.displayAmount.toFixed(2)} (no balance impact)`
            : e.amount === 0
            ? "—"
            : e.amount > 0
            ? `$${e.amount.toFixed(2)}`
            : `-$${Math.abs(e.amount).toFixed(2)}`;
        return `${new Date(e.date).toLocaleDateString()}  ${e.description}  ${amt}  (Balance: $${e.balance.toFixed(2)})`;
      }),
    "",
    `Current Balance: $${Number(customer.balance).toFixed(2)}`,
    "",
    `Thank you for your business — ${COMPANY.name}`,
  ];
  const emailMailto = buildMailtoUrl({
    to: [customer.email, customer.email2].filter(Boolean).join(","),
    subject: `Account Statement from ${COMPANY.name}`,
    body: emailBodyLines.join("\n"),
  });

  return (
    <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
      <p className="no-print mb-3">
        <Link href={`/customers?selected=${id}`} className="text-sm" style={{ color: "var(--faint)" }}>&larr; Back to {name}</Link>
      </p>

      <DocumentLetterhead />

      <h1 className="text-2xl font-semibold mt-4" style={{ color: "var(--deep)" }}>Account Statement — {name}</h1>
      <p className="text-sm mt-2">
        Current Balance:{" "}
        <strong className="mono" style={{ color: Number(customer.balance) > 0 ? "var(--rust)" : "var(--moss)" }}>
          ${Number(customer.balance).toFixed(2)}
        </strong>
      </p>

      <p className="no-print flex gap-4 mt-4">
        <PrintButton />
        <EmailButton mailtoUrl={emailMailto} />
      </p>

      {ledger.length === 0 ? (
        <p className="text-sm mt-4" style={{ color: "var(--faint)" }}>No activity on this account yet.</p>
      ) : (
        <div className="card overflow-hidden mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "var(--paper)" }}>
                <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wide" style={{ color: "var(--faint)" }}>Date</th>
                <th className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wide" style={{ color: "var(--faint)" }}>Description</th>
                <th className="px-3 py-2 text-right font-medium text-xs uppercase tracking-wide" style={{ color: "var(--faint)" }}>Amount</th>
                <th className="px-3 py-2 text-right font-medium text-xs uppercase tracking-wide" style={{ color: "var(--faint)" }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((e) => (
                <tr key={e.key}>
                  <td className="px-3 py-2 border-t hairline" style={{ color: "var(--faint)" }}>{new Date(e.date).toLocaleDateString()}</td>
                  <td className="px-3 py-2 border-t hairline">{e.description}</td>
                  <td className="px-3 py-2 border-t hairline text-right mono">
                    {e.displayAmount != null
                      ? `$${e.displayAmount.toFixed(2)} (no balance impact)`
                      : e.amount === 0
                      ? "—"
                      : e.amount > 0
                      ? `$${e.amount.toFixed(2)}`
                      : `-$${Math.abs(e.amount).toFixed(2)}`}
                  </td>
                  <td className="px-3 py-2 border-t hairline text-right mono">${e.balance.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
