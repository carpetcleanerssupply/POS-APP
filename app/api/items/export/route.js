import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { itemsToCsv } from "@/lib/csv";

export async function GET() {
  await requireSession();

  const items = await prisma.item.findMany({ orderBy: { name: "asc" } });
  const plain = items.map((i) => ({
    sku: i.sku,
    name: i.name,
    category: i.category,
    vendorName: i.vendorName,
    cost: Number(i.cost),
    price: Number(i.price),
    stock: i.stock,
    unit: i.unit,
    caseQty: i.caseQty,
    cogsAccount: i.cogsAccount,
    incomeAccount: i.incomeAccount,
  }));
  const csv = itemsToCsv(plain);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="item-database-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
