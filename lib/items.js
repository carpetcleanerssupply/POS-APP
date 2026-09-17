// Matches the prototype's default: most items go low at 5, chemicals sold
// by the gallon go low at 8. A per-item lowStockThreshold overrides this.
export function lowStockThreshold(item) {
  if (item.lowStockThreshold != null) return item.lowStockThreshold;
  const isChemicalGal =
    (item.category || "").trim().toLowerCase() === "chemicals" && /gal/i.test(item.name || "");
  return isChemicalGal ? 8 : 5;
}

export function isLowStock(item) {
  return item.stock <= lowStockThreshold(item);
}

// A cases-and-loose-units read on stock, for whoever's counting shelves —
// e.g. 51 in stock at 12/case reads as "4+3" (4 full cases, 3 loose).
export function casesPlusEach(item) {
  const caseQty = item.caseQty || 1;
  if (item.unit !== "ea" || caseQty <= 1) return null;
  return `${Math.floor(item.stock / caseQty)}+${item.stock % caseQty}`;
}

export function parseItemForm(form) {
  const str = (key) => form.get(key)?.toString().trim() || "";
  const num = (key, fallback = 0) => {
    const n = Number(form.get(key));
    return Number.isFinite(n) ? n : fallback;
  };

  const rawThreshold = str("lowStockThreshold");

  return {
    sku: str("sku"),
    name: str("name"),
    category: str("category") || null,
    vendorName: str("vendorName") || null,
    cost: Math.max(0, num("cost")),
    price: Math.max(0, num("price")),
    stock: Math.max(0, Math.floor(num("stock"))),
    unit: str("unit") || null,
    caseQty: Math.max(1, Math.floor(num("caseQty", 1))),
    cogsAccount: str("cogsAccount") || "Cost of Goods Sold",
    incomeAccount: str("incomeAccount") || "Uncategorized",
    lowStockThreshold: rawThreshold === "" ? null : Math.max(0, Math.floor(Number(rawThreshold) || 0)),
  };
}

export async function itemUsageCount(prisma, itemId) {
  const [invoiceLines, estimateLines, poLines] = await Promise.all([
    prisma.invoiceLine.count({ where: { itemId } }),
    prisma.estimateLine.count({ where: { itemId } }),
    prisma.purchaseOrderLine.count({ where: { itemId } }),
  ]);
  return invoiceLines + estimateLines + poLines;
}
