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
