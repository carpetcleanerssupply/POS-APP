import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { itemUsageCount } from "@/lib/items";

export async function POST(request, { params }) {
  await requireSession();

  const { id } = await params;
  const origin = new URL(request.url).origin;

  const usage = await itemUsageCount(prisma, id);
  if (usage > 0) {
    return NextResponse.redirect(`${origin}/items?error=in_use&count=${usage}`, { status: 303 });
  }

  await prisma.item.delete({ where: { id } }).catch((error) => {
    if (error.code !== "P2025") throw error;
  });

  return NextResponse.redirect(`${origin}/items`, { status: 303 });
}
