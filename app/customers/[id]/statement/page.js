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

const th = { textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "2px solid #ddd", fontSize: "0.85rem" };
const td = { padding: "0.5rem 0.75rem", borderBottom: "1px solid #eee" };

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
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 800 }}>
      <p className="no-print"><Link href={`/customers/${id}/edit`}>&larr; Back to {name}</Link></p>

      <DocumentLetterhead />

      <h1>Account Statement — {name}</h1>
      <p>
        Current Balance:{" "}
        <strong style={{ color: Number(customer.balance) > 0 ? "#c62828" : "#2e7d32" }}>
          ${Number(customer.balance).toFixed(2)}
        </strong>
      </p>

      <p className="no-print" style={{ display: "flex", gap: "1rem" }}>
        <PrintButton />
        <EmailButton mailtoUrl={emailMailto} />
      </p>

      {ledger.length === 0 ? (
        <p style={{ color: "#777" }}>No activity on this account yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Date</th>
              <th style={th}>Description</th>
              <th style={{ ...th, textAlign: "right" }}>Amount</th>
              <th style={{ ...th, textAlign: "right" }}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((e) => (
              <tr key={e.key}>
                <td style={td}>{new Date(e.date).toLocaleDateString()}</td>
                <td style={td}>{e.description}</td>
                <td style={{ ...td, textAlign: "right" }}>
                  {e.displayAmount != null
                    ? `$${e.displayAmount.toFixed(2)} (no balance impact)`
                    : e.amount === 0
                    ? "—"
                    : e.amount > 0
                    ? `$${e.amount.toFixed(2)}`
                    : `-$${Math.abs(e.amount).toFixed(2)}`}
                </td>
                <td style={{ ...td, textAlign: "right" }}>${e.balance.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
