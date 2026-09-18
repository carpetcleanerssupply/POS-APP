import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

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

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return NextResponse.redirect(`${origin}/login?error=locked`, { status: 303 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    const lockingOut = attempts >= MAX_ATTEMPTS;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: lockingOut ? 0 : attempts,
        lockedUntil: lockingOut ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null,
      },
    });
    return NextResponse.redirect(`${origin}/login?error=${lockingOut ? "locked" : "invalid"}`, { status: 303 });
  }

  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null } });
  }

  await createSession(user.id);
  await prisma.activityLog.create({
    data: { userId: user.id, action: "LOGIN" },
  });

  return NextResponse.redirect(`${origin}/`, { status: 303 });
}
