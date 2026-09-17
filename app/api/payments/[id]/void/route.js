import { prisma } from "@/lib/prisma";
import { requireSessionJson } from "@/lib/auth";
import { isOwnerManager, forbiddenJson } from "@/lib/authz";

export async function POST(request, { params }) {
  const { session, unauthorized } = await requireSessionJson();
  if (unauthorized) return unauthorized;
  if (!isOwnerManager(session)) return forbiddenJson("Voiding a payment requires an Owner/Manager login.");

  const { id } = await params;
  const payment = await prisma.payment.findUnique({ where: { id }, include: { applications: true } });
  if (!payment) return Response.json({ error: "That payment no longer exists." }, { status: 404 });
  if (payment.voided) return Response.json({ error: "That payment is already voided." }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    for (const app of payment.applications) {
      await tx.invoice.update({
        where: { id: app.invoiceId },
        data: { paidAmount: { decrement: app.amountApplied } },
      });
    }

    // A credit-consumption record never touched the balance when it was
    // created (it's a reallocation of money already counted), and neither did
    // an at-sale record (a paid-now invoice is a wash never added to
    // charges) — reversing balance for either would introduce money that was
    // never actually subtracted in the first place.
    if (payment.method !== "CREDIT" && !payment.atSale) {
      await tx.customer.update({
        where: { id: payment.customerId },
        data: { balance: { increment: payment.amount } },
      });
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: { voided: true, voidedAt: new Date(), voidedByUserId: session.user.id },
    });

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: "Payment voided",
        entityType: "Payment",
        entityId: payment.id,
        details: { amount: Number(payment.amount), customerName: payment.customerName },
      },
    });
  });

  return Response.json({ ok: true });
}
