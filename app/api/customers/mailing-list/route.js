import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { mailingListToCsv } from "@/lib/csv";

export async function GET() {
  await requireSession();

  const customers = await prisma.customer.findMany({ orderBy: [{ company: "asc" }, { lastName: "asc" }] });
  const csv = mailingListToCsv(customers);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mailing-list-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
