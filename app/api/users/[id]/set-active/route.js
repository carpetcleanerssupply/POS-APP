import { prisma } from "@/lib/prisma";
import { requireSessionJson } from "@/lib/auth";
import { isOwnerManager, forbiddenJson } from "@/lib/authz";

export async function POST(request, { params }) {
  const { session, unauthorized } = await requireSessionJson();
  if (unauthorized) return unauthorized;
  if (!isOwnerManager(session)) return forbiddenJson("Adding or removing staff requires an Owner/Manager login.");

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const active = Boolean(body.active);

  if (id === session.user.id && !active) {
    return Response.json({ error: "You can't deactivate your own login." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return Response.json({ error: "That user no longer exists." }, { status: 404 });

  await prisma.user.update({ where: { id }, data: { active } });
  return Response.json({ ok: true });
}
