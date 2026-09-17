import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { vendorsToCsv } from "@/lib/csv";

export async function GET() {
  await requireSession();

  const vendors = await prisma.vendor.findMany({ orderBy: { name: "asc" } });
  const csv = vendorsToCsv(vendors);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vendors-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
