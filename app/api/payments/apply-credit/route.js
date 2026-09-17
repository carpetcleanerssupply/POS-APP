import { prisma } from "@/lib/prisma";
import { requireSessionJson } from "@/lib/auth";
import { displayName } from "@/lib/customers";
import { buildCreditLedger, describeCreditSources } from "@/lib/creditLedger";

export async function POST(request) {
  const { session, unauthorized } = await requireSessionJson();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request body." }, { status: 400 });

  const { customerId, invoiceIds = [] } = body;
  if (!customerId) return Response.json({ error: "Select a customer." }, { status: 400 });
  if (invoiceIds.length === 0) {
    return Response.json({ error: "Select at least one invoice to apply the credit to." }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return Response.json({ error: "That customer no longer exists." }, { status: 404 });

  const allPayments = await prisma.payment.findMany({ where: { customerId } });
  const ledger = buildCreditLedger(allPayments);
  const creditAvailable = ledger.reduce((sum, s) => sum + s.remaining, 0);

  if (creditAvailable <= 0.005) {
    return Response.json({ error: "No credit available for this customer." }, { status: 400 });
  }

  const openInvoices = await prisma.invoice.findMany({
    where: { customerId, status: "CLOSED", settledTo: "ACCOUNT", id: { in: invoiceIds } },
    orderBy: { date: "asc" },
  });
  const owedOf = (inv) => Number(inv.total) - Number(inv.paidAmount);

  let remaining = creditAvailable;
  const applied = [];
  for (const inv of openInvoices) {
    if (remaining <= 0.005) break;
    const owed = owedOf(inv);
    const applyAmt = Math.min(owed, remaining);
    if (applyAmt <= 0) continue;
    remaining -= applyAmt;
    applied.push({ invoiceId: inv.id, amountApplied: applyAmt });
  }

  const amountUsed = creditAvailable - remaining;
  if (amountUsed <= 0.005) return Response.json({ error: "Nothing to apply." }, { status: 400 });

  const sourceLabel = describeCreditSources(ledger, amountUsed);

  const payment = await prisma.$transaction(async (tx) => {
    for (const a of applied) {
      await tx.invoice.update({
        where: { id: a.invoiceId },
        data: { paidAmount: { increment: a.amountApplied }, paymentMethod: "CREDIT", checkNumber: null },
      });
    }

    // No balance adjustment here — this money was already counted in full when
    // the original overpayment was received. Applying it to a different
    // invoice is pure reallocation between invoices, not new money.
    const created = await tx.payment.create({
      data: {
        customerId: customer.id,
        customerName: displayName(customer),
        amount: amountUsed,
        method: "CREDIT",
        unapplied: 0,
        creditSourceLabel: sourceLabel,
        recordedByUserId: session.user.id,
        applications: { create: applied },
      },
    });

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: "Credit applied",
        entityType: "Payment",
        entityId: created.id,
        details: { amount: amountUsed, customerName: displayName(customer) },
      },
    });

    return created;
  });

  return Response.json({ id: payment.id }, { status: 201 });
}
