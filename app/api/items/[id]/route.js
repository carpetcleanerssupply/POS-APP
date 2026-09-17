import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { parseItemForm } from "@/lib/items";

export async function POST(request, { params }) {
  await requireSession();

  const { id } = await params;
  const origin = new URL(request.url).origin;
  const form = await request.formData();
  const data = parseItemForm(form);

  if (!data.sku || !data.name) {
    return NextResponse.redirect(`${origin}/items/${id}/edit?error=required`, { status: 303 });
  }

  try {
    await prisma.item.update({ where: { id }, data });
  } catch (error) {
    if (error.code === "P2002") {
      return NextResponse.redirect(`${origin}/items/${id}/edit?error=duplicate_sku`, { status: 303 });
    }
    if (error.code === "P2025") {
      return NextResponse.redirect(`${origin}/items?error=not_found`, { status: 303 });
    }
    throw error;
  }

  return NextResponse.redirect(`${origin}/items`, { status: 303 });
}
