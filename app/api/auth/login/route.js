import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export async function POST(request) {
  const origin = new URL(request.url).origin;
  const form = await request.formData();
  const username = form.get("username")?.toString().trim();
  const password = form.get("password")?.toString();

  if (!username || !password) {
    return NextResponse.redirect(`${origin}/login?error=missing`, { status: 303 });
  }

  const user = await prisma.user.findUnique({ where: { username } });

  if (!user || !user.active) {
    return NextResponse.redirect(`${origin}/login?error=invalid`, { status: 303 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.redirect(`${origin}/login?error=invalid`, { status: 303 });
  }

  await createSession(user.id);
  await prisma.activityLog.create({
    data: { userId: user.id, action: "LOGIN" },
  });

  return NextResponse.redirect(`${origin}/`, { status: 303 });
}
