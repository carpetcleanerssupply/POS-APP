export function poTotal(lines) {
  return lines.reduce((sum, l) => sum + Number(l.qtyOrdered) * Number(l.cost), 0);
}

export function isPoEditable(po) {
  return po.status === "DRAFT" || po.status === "ORDERED";
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
