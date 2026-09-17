import { prisma } from "@/lib/prisma";
import { requireSessionJson } from "@/lib/auth";

export async function POST(request, { params }) {
  const { session, unauthorized } = await requireSessionJson();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const ret = await prisma.return.findUnique({ where: { id }, include: { lines: true } });
  if (!ret) return Response.json({ error: "That return no longer exists." }, { status: 404 });
  if (ret.voided) return Response.json({ error: "That return is already voided." }, { status: 400 });

  const creditedAccount = ret.refundMethod === "ACCOUNT";

  await prisma.$transaction(async (tx) => {
    for (const line of ret.lines) {
      if (!line.itemId) continue;
      // Take the returned stock back off the shelf — it was never actually returned.
      const item = await tx.item.findUnique({ where: { id: line.itemId } });
      if (!item) continue;
      await tx.item.update({ where: { id: item.id }, data: { stock: Math.max(0, item.stock - line.qty) } });
    }

    if (creditedAccount) {
      const invoice = await tx.invoice.findUnique({ where: { id: ret.originalInvoiceId } });
      if (invoice) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { paidAmount: Math.max(0, Number(invoice.paidAmount) - Number(ret.total)) },
        });
      }
      await tx.customer.update({ where: { id: ret.customerId }, data: { balance: { increment: ret.total } } });
    }

    await tx.return.update({
      where: { id: ret.id },
      data: { voided: true, voidedAt: new Date(), voidedByUserId: session.user.id },
    });

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: "Return voided",
        entityType: "Return",
        entityId: ret.id,
        details: { total: Number(ret.total), customerName: ret.customerName },
      },
    });
  });

  return Response.json({ ok: true });
}
