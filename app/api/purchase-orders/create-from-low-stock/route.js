import { prisma } from "@/lib/prisma";
import { requireSessionJson } from "@/lib/auth";
import { isLowStock, lowStockThreshold } from "@/lib/items";
import { groupLowStockForReorder } from "@/lib/purchaseOrders";

export async function POST() {
  const { session, unauthorized } = await requireSessionJson();
  if (unauthorized) return unauthorized;

  const allItems = await prisma.item.findMany();
  const lowItems = allItems.filter(isLowStock);
  if (lowItems.length === 0) return Response.json({ error: "Nothing is currently low on stock." }, { status: 400 });

  const groups = groupLowStockForReorder(lowItems, lowStockThreshold);
  const vendors = await prisma.vendor.findMany({ where: { name: { in: [...groups.keys()] } } });
  const vendorByName = new Map(vendors.map((v) => [v.name, v]));

  const created = [];
  const skippedVendorNames = [];
  for (const [vendorName, lines] of groups) {
    const vendor = vendorByName.get(vendorName);
    if (!vendor) {
      skippedVendorNames.push(vendorName);
      continue;
    }
    const po = await prisma.purchaseOrder.create({
      data: {
        vendorId: vendor.id,
        vendorName: vendor.name,
        notes: "Created from Dashboard — Needs Reordering. Review quantities before ordering.",
        recordedByUserId: session.user.id,
        lines: { create: lines },
      },
    });
    created.push(po);
  }

  if (created.length > 0) {
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "Draft PO(s) created from low stock",
        details: { count: created.length, lowStockItemCount: lowItems.length },
      },
    });
  }

  return Response.json({ createdCount: created.length, skippedVendorNames }, { status: 201 });
}
