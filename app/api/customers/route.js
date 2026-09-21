import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { parseCustomerForm, isValidCustomer } from "@/lib/customers";

export async function POST(request) {
  await requireSession();

  const origin = new URL(request.url).origin;
  const form = await request.formData();
  const data = parseCustomerForm(form);

  if (!isValidCustomer(data)) {
    return NextResponse.redirect(`${origin}/customers/new?error=required`, { status: 303 });
  }

  const customer = await prisma.customer.create({ data });
  return NextResponse.redirect(`${origin}/customers?selected=${customer.id}`, { status: 303 });
}
