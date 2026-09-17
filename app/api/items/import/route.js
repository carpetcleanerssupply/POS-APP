import { prisma } from "@/lib/prisma";
import { requireSessionJson } from "@/lib/auth";
import { parseItemsCsv } from "@/lib/csv";

export async function POST(request) {
  const { unauthorized } = await requireSessionJson();
  if (unauthorized) return unauthorized;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") {
    return Response.json({ error: "Choose a CSV file to upload." }, { status: 400 });
  }

  const text = await file.text();
  let rows;
  try {
    rows = parseItemsCsv(text);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  const usable = rows.filter((r) => r.sku && r.name);
  if (usable.length === 0) {
    return Response.json({ error: "No usable rows found — each row needs at least a SKU and Item Name." }, { status: 400 });
  }

  let created = 0;
  let updated = 0;
  const errors = [];

  for (const row of usable) {
    try {
      const data = {
        name: row.name,
        category: row.category || null,
        vendorName: row.vendorName || null,
        cost: Math.max(0, row.cost),
        price: Math.max(0, row.price),
        stock: Math.max(0, Math.floor(row.stock)),
        unit: row.unit || null,
        caseQty: Math.max(1, Math.floor(row.caseQty) || 1),
        cogsAccount: row.cogsAccount || "Cost of Goods Sold",
        incomeAccount: row.incomeAccount || "Uncategorized",
      };
      const existing = await prisma.item.findUnique({ where: { sku: row.sku } });
      await prisma.item.upsert({ where: { sku: row.sku }, update: data, create: { sku: row.sku, ...data } });
      if (existing) updated++;
      else created++;
    } catch (error) {
      errors.push(`${row.sku}: ${error.message}`);
    }
  }

  return Response.json({ created, updated, errors }, { status: 200 });
}
