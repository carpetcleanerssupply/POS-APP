import { prisma } from "@/lib/prisma";
import { requireSessionJson } from "@/lib/auth";

export async function POST(request, { params }) {
  const { unauthorized } = await requireSessionJson();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const estimate = await prisma.estimate.findUnique({ where: { id } });
  if (!estimate) return Response.json({ error: "That estimate no longer exists." }, { status: 404 });
  if (estimate.status !== "OPEN") {
    return Response.json({ error: "A converted estimate can't be deleted." }, { status: 400 });
  }

  await prisma.estimate.delete({ where: { id } });
  return Response.json({ ok: true });
}
