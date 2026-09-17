import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { paymentsToCsv } from "@/lib/csv";

export async function GET() {
  await requireSession();

  const payments = await prisma.payment.findMany({
    orderBy: { date: "desc" },
    include: { recordedBy: true },
  });

  const rows = payments.map((p) => ({ ...p, recordedByName: p.recordedBy?.name || "" }));
  const csv = paymentsToCsv(rows);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payments-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
