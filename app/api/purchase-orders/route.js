import { prisma } from "@/lib/prisma";
import { requireSessionJson } from "@/lib/auth";
import { parsePoLines } from "@/lib/purchaseOrders";

export async function POST(request) {
  const { session, unauthorized } = await requireSessionJson();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request body." }, { status: 400 });

  const { vendorId, notes = "", lines: rawLines = [] } = body;
  if (!vendorId) return Response.json({ error: "Select a vendor." }, { status: 400 });

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) return Response.json({ error: "That vendor no longer exists." }, { status: 404 });

  const lineData = [];
  for (const raw of parsePoLines(rawLines)) {
    const item = await prisma.item.findUnique({ where: { id: raw.itemId } });
    if (!item) continue;
    lineData.push({
      itemId: item.id,
      sku: item.sku,
      name: item.name,
      description: raw.description,
      qtyOrdered: raw.qtyOrdered,
      cost: raw.cost,
      caseQty: raw.caseQty,
    });
  }

  const po = await prisma.purchaseOrder.create({
    data: {
      vendorId: vendor.id,
      vendorName: vendor.name,
      notes: notes || null,
      recordedByUserId: session.user.id,
      lines: { create: lineData },
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      action: "Purchase order created",
      entityType: "PurchaseOrder",
      entityId: po.id,
      details: { number: po.number, vendorName: vendor.name },
    },
  });

  return Response.json({ id: po.id, number: po.number }, { status: 201 });
}
