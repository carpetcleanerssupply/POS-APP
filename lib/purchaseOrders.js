export function poTotal(lines) {
  return lines.reduce((sum, l) => sum + Number(l.qtyOrdered) * Number(l.cost), 0);
}

export function isPoEditable(po) {
  return po.status === "DRAFT" || po.status === "ORDERED";
}

// Groups every currently-low item by vendor name and works out a starting
// order quantity for each — bringing stock back up to double the low-stock
// threshold, rounded up to whole cases. A reasonable default staff can
// always adjust before placing the order; nothing here is final until the
// draft PO is marked ordered.
export function groupLowStockForReorder(items, lowStockThreshold) {
  const groups = new Map();
  for (const item of items) {
    const key = (item.vendorName || "").trim();
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    const caseQty = Math.max(1, item.caseQty || 1);
    const piecesNeeded = Math.max(caseQty, lowStockThreshold(item) * 2 - item.stock);
    const qtyOrdered = Math.ceil(piecesNeeded / caseQty);
    groups.get(key).push({
      itemId: item.id,
      sku: item.sku,
      name: item.name,
      description: null,
      qtyOrdered,
      cost: Number(item.cost),
      caseQty,
    });
  }
  return groups;
}

export function parsePoLines(rawLines) {
  return (rawLines || [])
    .filter((l) => l && l.itemId)
    .map((l) => ({
      itemId: l.itemId,
      qtyOrdered: Math.max(0, Math.floor(Number(l.qtyOrdered) || 0)),
      cost: Math.max(0, Number(l.cost) || 0),
      caseQty: Math.max(1, Math.floor(Number(l.caseQty) || 1)),
      description: l.description || null,
    }))
    .filter((l) => l.qtyOrdered > 0);
}
