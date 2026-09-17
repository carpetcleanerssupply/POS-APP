import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { isOwnerManager } from "@/lib/authz";

export async function GET() {
  const session = await requireSession();
  if (!isOwnerManager(session)) {
    return Response.json({ error: "Owner/Manager only." }, { status: 403 });
  }

  const items = await prisma.item.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  const csv = Papa.unparse({
    fields: ["SKU", "Item Name", "Category", "Vendor", "Qty On Hand", "Unit Cost", "Total Value"],
    data: items.map((i) => [
      i.sku,
      i.name,
      i.category || "",
      i.vendorName || "",
      i.stock,
      Number(i.cost).toFixed(2),
      (i.stock * Number(i.cost)).toFixed(2),
    ]),
  });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inventory-valuation-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
