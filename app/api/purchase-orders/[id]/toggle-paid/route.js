import { prisma } from "@/lib/prisma";
import { requireSessionJson } from "@/lib/auth";
import { isOwnerManager, forbiddenJson } from "@/lib/authz";

export async function POST(request, { params }) {
  const { session, unauthorized } = await requireSessionJson();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po) return Response.json({ error: "That purchase order no longer exists." }, { status: 404 });

  // Marking a PO paid is routine; un-marking it reverses a real "this was
  // paid" record and is reserved for Owner/Manager, same as Void Payment.
  if (po.paid && !isOwnerManager(session)) {
    return forbiddenJson("Unmarking a PO as paid requires an Owner/Manager login.");
  }

  const body = await request.json().catch(() => ({}));
  const marking = !po.paid;

  if (marking && body.method === "CHECK" && !body.checkNumber?.trim()) {
    return Response.json({ error: "Enter a check number." }, { status: 400 });
  }

  await prisma.purchaseOrder.update({
    where: { id },
    data: { paid: marking, checkNumber: marking ? (body.method === "CHECK" ? body.checkNumber.trim() : null) : po.checkNumber },
  });

  return Response.json({ ok: true, paid: !po.paid });
}
