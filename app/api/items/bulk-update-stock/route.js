import { prisma } from "@/lib/prisma";
import { requireSessionJson } from "@/lib/auth";

export async function POST(request) {
  const { session, unauthorized } = await requireSessionJson();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const updates = body?.updates;
  if (!updates || typeof updates !== "object" || Object.keys(updates).length === 0) {
    return Response.json({ error: "No updates given." }, { status: 400 });
  }

  const entries = Object.entries(updates)
    .map(([id, fields]) => {
      const data = {};
      if (fields && fields.stock !== undefined) {
        const stock = Math.max(0, Math.floor(Number(fields.stock)));
        if (Number.isFinite(stock)) data.stock = stock;
      }
      if (fields && fields.unit !== undefined) {
        const unit = String(fields.unit).trim();
        data.unit = unit === "" ? null : unit;
      }
      if (fields && fields.caseQty !== undefined) {
        const caseQty = Math.max(1, Math.floor(Number(fields.caseQty)));
        if (Number.isFinite(caseQty)) data.caseQty = caseQty;
      }
      return [id, data];
    })
    .filter(([, data]) => Object.keys(data).length > 0);

  if (entries.length === 0) {
    return Response.json({ error: "No valid updates given." }, { status: 400 });
  }

  await prisma.$transaction(entries.map(([id, data]) => prisma.item.update({ where: { id }, data })));

  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      action: "Bulk item update",
      details: { count: entries.length },
    },
  });

  return Response.json({ updatedCount: entries.length });
}
