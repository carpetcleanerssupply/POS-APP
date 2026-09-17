import { prisma } from "@/lib/prisma";
import { requireSessionJson } from "@/lib/auth";

export async function POST(request, { params }) {
  const { unauthorized } = await requireSessionJson();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const po = await prisma.purchaseOrder.findUnique({ where: { id }, include: { lines: true } });
  if (!po) return Response.json({ error: "That purchase order no longer exists." }, { status: 404 });
  if (po.status !== "DRAFT") return Response.json({ error: "Only a draft PO can be marked as ordered." }, { status: 400 });
  if (po.lines.length === 0) {
    return Response.json({ error: "Add at least one item before marking this PO as ordered." }, { status: 400 });
  }

  await prisma.purchaseOrder.update({ where: { id }, data: { status: "ORDERED" } });
  return Response.json({ ok: true });
}
