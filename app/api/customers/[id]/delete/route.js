import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { customerUsage } from "@/lib/customers";

export async function POST(request, { params }) {
  await requireSession();

  const { id } = await params;
  const origin = new URL(request.url).origin;

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) {
    return NextResponse.redirect(`${origin}/customers?error=not_found`, { status: 303 });
  }

  const usage = await customerUsage(prisma, customer);
  if (usage.hasBalance) {
    return NextResponse.redirect(`${origin}/customers?selected=${id}&error=has_balance`, { status: 303 });
  }
  if (usage.invoiceCount > 0 || usage.estimateCount > 0) {
    return NextResponse.redirect(
      `${origin}/customers?selected=${id}&error=has_history&invoices=${usage.invoiceCount}&estimates=${usage.estimateCount}`,
      { status: 303 }
    );
  }

  await prisma.customer.delete({ where: { id } });
  return NextResponse.redirect(`${origin}/customers`, { status: 303 });
}
