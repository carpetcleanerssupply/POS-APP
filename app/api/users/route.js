import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSessionJson } from "@/lib/auth";
import { isOwnerManager, forbiddenJson } from "@/lib/authz";

export async function POST(request) {
  const { session, unauthorized } = await requireSessionJson();
  if (unauthorized) return unauthorized;
  if (!isOwnerManager(session)) return forbiddenJson("Adding a login requires an Owner/Manager login.");

  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request body." }, { status: 400 });

  const username = body.username?.toString().trim();
  const name = body.name?.toString().trim();
  const tier = body.tier;
  const password = body.password?.toString() || "";

  if (!username || !name) return Response.json({ error: "Enter a username and name." }, { status: 400 });
  if (tier !== "OWNER_MANAGER" && tier !== "STAFF") return Response.json({ error: "Choose a tier." }, { status: 400 });
  if (password.length < 8) return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.user.create({ data: { username, name, tier, passwordHash } });
    return Response.json({ id: user.id }, { status: 201 });
  } catch (error) {
    if (error.code === "P2002") return Response.json({ error: "That username is already taken." }, { status: 400 });
    throw error;
  }
}
