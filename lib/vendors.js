import { poTotal } from "@/lib/purchaseOrders";

export function parseVendorForm(form) {
  const str = (key) => form.get(key)?.toString().trim() || "";
  const optStr = (key) => str(key) || null;

  return {
    name: str("name"),
    contactName: optStr("contactName"),
    phone: optStr("phone"),
    email: optStr("email"),
    email2: optStr("email2"),
    addressStreet: optStr("addressStreet"),
    addressStreet2: optStr("addressStreet2"),
    addressCity: optStr("addressCity"),
    addressState: optStr("addressState"),
    addressZip: optStr("addressZip"),
    notes: optStr("notes"),
  };
}

export async function vendorUsage(prisma, vendor) {
  const [itemCount, poCount] = await Promise.all([
    prisma.item.count({ where: { vendorName: vendor.name } }),
    prisma.purchaseOrder.count({ where: { vendorId: vendor.id } }),
  ]);
  return { itemCount, poCount };
}

// What's still owed to this vendor — every PO placed with them (not a
// draft still being put together) that hasn't been marked paid yet.
export async function vendorBalanceDue(prisma, vendor) {
  const unpaidPos = await prisma.purchaseOrder.findMany({
    where: { vendorId: vendor.id, status: { not: "DRAFT" }, paid: false },
    include: { lines: true },
  });
  return unpaidPos.reduce((sum, po) => sum + poTotal(po.lines), 0);
}
