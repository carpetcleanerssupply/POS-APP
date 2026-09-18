import { prisma } from "@/lib/prisma";
import { requireSessionJson } from "@/lib/auth";

export async function POST(request) {
  const { session, unauthorized } = await requireSessionJson();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const updates = body?.updates;
  if (!updates || typeof updates !== "object" || Object.keys(updates).length === 0) {
    return Response.json({ error: "No stock updates given." }, { status: 400 });
  }

  const entries = Object.entries(updates)
    .map(([id, stock]) => [id, Math.max(0, Math.floor(Number(stock)))])
    .filter(([, stock]) => Number.isFinite(stock));

  await prisma.$transaction(entries.map(([id, stock]) => prisma.item.update({ where: { id }, data: { stock } })));

  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      action: "Bulk stock update",
      details: { count: entries.length },
    },
  });

  return Response.json({ updatedCount: entries.length });
}
