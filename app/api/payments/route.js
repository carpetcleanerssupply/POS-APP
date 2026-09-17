import { prisma } from "@/lib/prisma";
import { requireSessionJson } from "@/lib/auth";
import { displayName } from "@/lib/customers";

const REAL_METHODS = new Set(["CARD", "CHECK", "CASH"]);

export async function POST(request) {
  const { session, unauthorized } = await requireSessionJson();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request body." }, { status: 400 });

  const { customerId, amount, method, checkNumber = "", invoiceIds = [] } = body;

  const amt = Number(amount) || 0;
  if (!customerId) return Response.json({ error: "Select a customer." }, { status: 400 });
  if (amt <= 0) return Response.json({ error: "Enter a payment amount greater than $0." }, { status: 400 });
  if (!REAL_METHODS.has(method)) return Response.json({ error: "Choose a payment method." }, { status: 400 });
  if (method === "CHECK" && !checkNumber.trim()) {
    return Response.json({ error: "Enter a check number." }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return Response.json({ error: "That customer no longer exists." }, { status: 404 });

  const openInvoices = await prisma.invoice.findMany({
    where: { customerId, status: "CLOSED", settledTo: "ACCOUNT" },
    orderBy: { date: "asc" },
  });
  const owedOf = (inv) => Number(inv.total) - Number(inv.paidAmount);
  const eligible = openInvoices.filter((inv) => owedOf(inv) > 0.005);

  const targets = (invoiceIds.length > 0 ? eligible.filter((inv) => invoiceIds.includes(inv.id)) : eligible).sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  let remaining = amt;
  const applied = [];
  for (const inv of targets) {
    if (remaining <= 0) break;
    const owed = owedOf(inv);
    const applyAmt = Math.min(owed, remaining);
    if (applyAmt <= 0) continue;
    remaining -= applyAmt;
    applied.push({ invoiceId: inv.id, amountApplied: applyAmt });
  }
  const unapplied = Math.max(0, remaining);

  const payment = await prisma.$transaction(async (tx) => {
    for (const a of applied) {
      await tx.invoice.update({
        where: { id: a.invoiceId },
        data: {
          paidAmount: { increment: a.amountApplied },
          paymentMethod: method,
          checkNumber: method === "CHECK" ? checkNumber.trim() : null,
        },
      });
    }

    const created = await tx.payment.create({
      data: {
        customerId: customer.id,
        customerName: displayName(customer),
        amount: amt,
        method,
        checkNumber: method === "CHECK" ? checkNumber.trim() : null,
        unapplied,
        recordedByUserId: session.user.id,
        applications: { create: applied },
      },
    });

    await tx.customer.update({ where: { id: customer.id }, data: { balance: { decrement: amt } } });

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: "Payment applied",
        entityType: "Payment",
        entityId: created.id,
        details: { amount: amt, method, customerName: displayName(customer) },
      },
    });

    return created;
  });

  return Response.json({ id: payment.id }, { status: 201 });
}
