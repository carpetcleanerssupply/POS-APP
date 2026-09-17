import { prisma } from "@/lib/prisma";
import { requireSessionJson } from "@/lib/auth";

export async function POST(request, { params }) {
  const { unauthorized } = await requireSessionJson();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po) return Response.json({ error: "That purchase order no longer exists." }, { status: 404 });

  // Once a PO has been ordered or received it's a real business record — only
  // a draft that never went anywhere is safe to delete outright.
  if (po.status !== "DRAFT") {
    return Response.json({ error: "Only a draft PO can be deleted." }, { status: 400 });
  }

  await prisma.purchaseOrder.delete({ where: { id } });
  return Response.json({ ok: true });
}
