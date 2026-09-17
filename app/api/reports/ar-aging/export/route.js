import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { isOwnerManager } from "@/lib/authz";
import { buildArAging } from "@/lib/reports";

export async function GET() {
  const session = await requireSession();
  if (!isOwnerManager(session)) {
    return Response.json({ error: "Owner/Manager only." }, { status: 403 });
  }

  const { rows } = await buildArAging(prisma);
  const csv = Papa.unparse({
    fields: ["Customer", "Current", "1-30 Days", "31-60 Days", "61-90 Days", "90+ Days", "Total Due"],
    data: rows.map((r) => [r.customerName, r.current.toFixed(2), r.d30.toFixed(2), r.d60.toFixed(2), r.d90.toFixed(2), r.d90plus.toFixed(2), r.total.toFixed(2)]),
  });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ar-aging-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
