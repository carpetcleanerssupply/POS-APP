import { prisma } from "@/lib/prisma";
import { requireSessionJson } from "@/lib/auth";

export async function POST(request, { params }) {
  const { session, unauthorized } = await requireSessionJson();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request body." }, { status: 400 });

  const receipts = Array.isArray(body.receipts) ? body.receipts : [];

  const po = await prisma.purchaseOrder.findUnique({ where: { id }, include: { lines: true } });
  if (!po) return Response.json({ error: "That purchase order no longer exists." }, { status: 404 });
  if (po.status !== "ORDERED" && po.status !== "PARTIAL") {
    return Response.json({ error: "This PO isn't awaiting receiving." }, { status: 400 });
  }

  const toReceive = receipts
    .map((r) => ({ lineId: r.lineId, qty: Math.max(0, Math.floor(Number(r.qty) || 0)) }))
    .filter((r) => r.qty > 0);

  if (toReceive.length === 0) {
    return Response.json({ error: "Enter a quantity to receive for at least one item." }, { status: 400 });
  }

  let totalPieces = 0;

  await prisma.$transaction(async (tx) => {
    for (const r of toReceive) {
      const line = po.lines.find((l) => l.id === r.lineId);
      if (!line) continue;
      const qty = Math.min(r.qty, line.qtyOrdered - line.qtyReceived);
      if (qty <= 0) continue;

      const pieces = qty * line.caseQty;
      totalPieces += pieces;

      if (line.itemId) {
        await tx.item.update({ where: { id: line.itemId }, data: { stock: { increment: pieces } } });
      }
      await tx.purchaseOrderLine.update({ where: { id: line.id }, data: { qtyReceived: { increment: qty } } });
    }

    const updatedLines = await tx.purchaseOrderLine.findMany({ where: { poId: id } });
    const fullyReceived = updatedLines.every((l) => l.qtyReceived >= l.qtyOrdered);

    await tx.purchaseOrder.update({
      where: { id },
      data: { status: fullyReceived ? "RECEIVED" : "PARTIAL" },
    });

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: "PO received",
        entityType: "PurchaseOrder",
        entityId: id,
        details: { number: po.number, pieces: totalPieces, fullyReceived },
      },
    });
  });

  return Response.json({ ok: true, totalPieces });
}
