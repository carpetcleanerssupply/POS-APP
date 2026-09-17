import { prisma } from "@/lib/prisma";
import { requireSessionJson } from "@/lib/auth";
import { TAX_RATE, lineExt } from "@/lib/invoices";

export async function POST(request, { params }) {
  const { session, unauthorized } = await requireSessionJson();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request body." }, { status: 400 });

  const estimate = await prisma.estimate.findUnique({ where: { id } });
  if (!estimate) return Response.json({ error: "That estimate no longer exists." }, { status: 404 });
  if (estimate.status !== "OPEN") {
    return Response.json({ error: "A converted estimate can't be edited." }, { status: 400 });
  }

  const { expirationDate, notes = "", shippingCharge: rawShippingCharge = 0, lines: rawLines = [] } = body;
  const dedupedLines = (rawLines || []).filter((l) => l && l.itemId && Number(l.qty) > 0);
  if (dedupedLines.length === 0) return Response.json({ error: "Add at least one line item." }, { status: 400 });

  const customer = await prisma.customer.findUnique({ where: { id: estimate.customerId } });
  if (!customer) return Response.json({ error: "This estimate's customer no longer exists." }, { status: 400 });

  const shippingCharge = Math.max(0, Number(rawShippingCharge) || 0);
  const lineData = [];
  let subtotal = 0;
  for (const raw of dedupedLines) {
    const item = await prisma.item.findUnique({ where: { id: raw.itemId } });
    if (!item) continue;
    const qty = Math.floor(Number(raw.qty));
    if (qty <= 0) continue;
    const ext = lineExt(item.price, qty, raw.discountPct);
    subtotal += ext;
    lineData.push({
      itemId: item.id,
      sku: item.sku,
      name: item.name,
      qty,
      price: item.price,
      discountPct: Math.min(100, Math.max(0, Number(raw.discountPct) || 0)),
      ext,
      note: raw.note || null,
    });
  }
  if (lineData.length === 0) return Response.json({ error: "Add at least one line item." }, { status: 400 });

  const tax = customer.taxExempt ? 0 : subtotal * TAX_RATE;
  const total = subtotal + shippingCharge + tax;

  await prisma.$transaction([
    prisma.estimateLine.deleteMany({ where: { estimateId: id } }),
    prisma.estimate.update({
      where: { id },
      data: {
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        notes: notes || null,
        subtotal,
        shippingCharge,
        tax,
        total,
        lines: { create: lineData },
      },
    }),
  ]);

  return Response.json({ id }, { status: 200 });
}
