import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { returnsToCsv } from "@/lib/csv";

export async function GET() {
  await requireSession();

  const returns = await prisma.return.findMany({
    orderBy: { number: "desc" },
    include: { processedBy: true, originalInvoice: true },
  });

  const rows = returns.map((r) => ({
    ...r,
    processedByName: r.processedBy?.name || "",
    originalInvoiceNumber: r.originalInvoice?.number ?? "",
  }));
  const csv = returnsToCsv(rows);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="returns-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
