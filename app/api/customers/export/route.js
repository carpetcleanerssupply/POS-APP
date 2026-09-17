import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { customersToCsv } from "@/lib/csv";

export async function GET() {
  await requireSession();

  const customers = await prisma.customer.findMany({ orderBy: [{ company: "asc" }, { lastName: "asc" }] });
  const plain = customers.map((c) => ({ ...c, balance: Number(c.balance) }));
  const csv = customersToCsv(plain);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="customers-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
