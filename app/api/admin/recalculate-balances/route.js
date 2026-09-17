import { prisma } from "@/lib/prisma";
import { requireSessionJson } from "@/lib/auth";
import { isOwnerManager, forbiddenJson } from "@/lib/authz";

export async function POST() {
  const { session, unauthorized } = await requireSessionJson();
  if (unauthorized) return unauthorized;
  if (!isOwnerManager(session)) return forbiddenJson("Recalculating balances requires an Owner/Manager login.");

  const [invoices, payments, returns, customers] = await Promise.all([
    prisma.invoice.findMany(),
    prisma.payment.findMany({ include: { applications: true } }),
    prisma.return.findMany(),
    prisma.customer.findMany(),
  ]);

  // Rebuilds every invoice's paidAmount and every customer's balance from the
  // full transaction history, rather than trusting whatever incremental
  // writes led here — the same formula used when each of those writes
  // happened, replayed from scratch so any drift gets corrected.
  const paidAmountByInvoice = {};
  for (const inv of invoices) {
    if (inv.status === "DRAFT" || inv.settledTo !== "ACCOUNT") continue;
    const paidViaPayments = payments
      .filter((p) => !p.voided)
      .reduce((sum, p) => sum + p.applications.filter((a) => a.invoiceId === inv.id).reduce((s, a) => s + Number(a.amountApplied), 0), 0);
    const creditedViaReturns = returns
      .filter((r) => r.originalInvoiceId === inv.id && r.refundMethod === "ACCOUNT" && !r.voided)
      .reduce((sum, r) => sum + Number(r.total), 0);
    paidAmountByInvoice[inv.id] = Math.min(Number(inv.total), paidViaPayments + creditedViaReturns);
  }

  const balanceByCustomer = {};
  for (const c of customers) {
    const charges = invoices
      .filter((inv) => inv.customerId === c.id && inv.status !== "DRAFT" && inv.settledTo === "ACCOUNT")
      .reduce((sum, inv) => sum + Number(inv.total), 0);

    const paid = payments
      .filter((p) => p.customerId === c.id && p.method !== "CREDIT" && !p.atSale && !p.voided)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const creditedReturns = returns
      .filter((r) => r.customerId === c.id && r.refundMethod === "ACCOUNT" && !r.voided)
      .reduce((sum, r) => sum + Number(r.total), 0);

    const creditSpentOnPaidNowInvoices = payments
      .filter((p) => p.customerId === c.id && p.method === "CREDIT" && !p.voided)
      .reduce(
        (sum, p) =>
          sum +
          p.applications.reduce((s, a) => {
            const targetInv = invoices.find((inv) => inv.id === a.invoiceId);
            return targetInv && targetInv.settledTo !== "ACCOUNT" ? s + Number(a.amountApplied) : s;
          }, 0),
        0
      );

    balanceByCustomer[c.id] = charges - paid - creditedReturns + creditSpentOnPaidNowInvoices;
  }

  await prisma.$transaction([
    ...Object.entries(paidAmountByInvoice).map(([id, paidAmount]) =>
      prisma.invoice.update({ where: { id }, data: { paidAmount } })
    ),
    ...Object.entries(balanceByCustomer).map(([id, balance]) =>
      prisma.customer.update({ where: { id }, data: { balance } })
    ),
    prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "Balances recalculated",
        details: { customerCount: customers.length, invoiceCount: Object.keys(paidAmountByInvoice).length },
      },
    }),
  ]);

  return Response.json({ ok: true, customerCount: customers.length });
}
