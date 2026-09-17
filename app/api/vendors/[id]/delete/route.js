import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { vendorUsage } from "@/lib/vendors";

export async function POST(request, { params }) {
  await requireSession();

  const { id } = await params;
  const origin = new URL(request.url).origin;

  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) return NextResponse.redirect(`${origin}/vendors?error=not_found`, { status: 303 });

  const usage = await vendorUsage(prisma, vendor);
  if (usage.itemCount > 0 || usage.poCount > 0) {
    return NextResponse.redirect(
      `${origin}/vendors?error=in_use&items=${usage.itemCount}&pos=${usage.poCount}`,
      { status: 303 }
    );
  }

  await prisma.vendor.delete({ where: { id } });
  return NextResponse.redirect(`${origin}/vendors`, { status: 303 });
}
