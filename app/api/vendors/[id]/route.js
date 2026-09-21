import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { parseVendorForm } from "@/lib/vendors";

export async function POST(request, { params }) {
  await requireSession();

  const { id } = await params;
  const origin = new URL(request.url).origin;
  const form = await request.formData();
  const data = parseVendorForm(form);

  if (!data.name) {
    return NextResponse.redirect(`${origin}/vendors?selected=${id}&edit=1&error=required`, { status: 303 });
  }

  try {
    await prisma.vendor.update({ where: { id }, data });
  } catch (error) {
    if (error.code === "P2002") {
      return NextResponse.redirect(`${origin}/vendors?selected=${id}&edit=1&error=duplicate_name`, { status: 303 });
    }
    if (error.code === "P2025") {
      return NextResponse.redirect(`${origin}/vendors?error=not_found`, { status: 303 });
    }
    throw error;
  }

  return NextResponse.redirect(`${origin}/vendors?selected=${id}&saved=1`, { status: 303 });
}
