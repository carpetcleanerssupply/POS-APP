import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { parseVendorForm } from "@/lib/vendors";

export async function POST(request) {
  await requireSession();

  const origin = new URL(request.url).origin;
  const form = await request.formData();
  const data = parseVendorForm(form);

  if (!data.name) {
    return NextResponse.redirect(`${origin}/vendors/new?error=required`, { status: 303 });
  }

  let vendor;
  try {
    vendor = await prisma.vendor.create({ data });
  } catch (error) {
    if (error.code === "P2002") {
      return NextResponse.redirect(`${origin}/vendors/new?error=duplicate_name`, { status: 303 });
    }
    throw error;
  }

  return NextResponse.redirect(`${origin}/vendors?selected=${vendor.id}`, { status: 303 });
}
