import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { parseCustomerForm, isValidCustomer } from "@/lib/customers";

export async function POST(request, { params }) {
  await requireSession();

  const { id } = await params;
  const origin = new URL(request.url).origin;
  const form = await request.formData();
  const data = parseCustomerForm(form);

  if (!isValidCustomer(data)) {
    return NextResponse.redirect(`${origin}/customers/${id}/edit?error=required`, { status: 303 });
  }

  try {
    await prisma.customer.update({ where: { id }, data });
  } catch (error) {
    if (error.code === "P2025") {
      return NextResponse.redirect(`${origin}/customers?error=not_found`, { status: 303 });
    }
    throw error;
  }

  return NextResponse.redirect(`${origin}/customers/${id}/edit?saved=1`, { status: 303 });
}
