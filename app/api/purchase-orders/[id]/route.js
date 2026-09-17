import { prisma } from "@/lib/prisma";
import { requireSessionJson } from "@/lib/auth";
import { isPoEditable, parsePoLines } from "@/lib/purchaseOrders";

export async function POST(request, { params }) {
  const { unauthorized } = await requireSessionJson();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request body." }, { status: 400 });

  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po) return Response.json({ error: "That purchase order no longer exists." }, { status: 404 });
  if (!isPoEditable(po)) {
    return Response.json({ error: "This PO can no longer be edited — receiving has already started." }, { status: 400 });
  }

  const { vendorId, notes = "", lines: rawLines = [] } = body;
  let vendor = null;
  if (vendorId && vendorId !== po.vendorId) {
    vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) return Response.json({ error: "That vendor no longer exists." }, { status: 404 });
  }

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

  await prisma.$transaction([
    prisma.purchaseOrderLine.deleteMany({ where: { poId: id } }),
    prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...(vendor ? { vendorId: vendor.id, vendorName: vendor.name } : {}),
        notes: notes || null,
        lines: { create: lineData },
      },
    }),
  ]);

  return Response.json({ id }, { status: 200 });
}
