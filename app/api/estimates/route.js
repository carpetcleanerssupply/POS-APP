import { prisma } from "@/lib/prisma";
import { requireSessionJson } from "@/lib/auth";
import { TAX_RATE, lineExt } from "@/lib/invoices";
import { displayName } from "@/lib/customers";

export async function POST(request) {
  const { session, unauthorized } = await requireSessionJson();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request body." }, { status: 400 });

  const { customerId, expirationDate, notes = "", shippingCharge: rawShippingCharge = 0, lines: rawLines = [] } = body;

  if (!customerId) return Response.json({ error: "Select a customer." }, { status: 400 });
  const dedupedLines = (rawLines || []).filter((l) => l && l.itemId && Number(l.qty) > 0);
  if (dedupedLines.length === 0) {
    return Response.json({ error: "Add at least one line item." }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return Response.json({ error: "That customer no longer exists." }, { status: 404 });

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

  const estimate = await prisma.estimate.create({
    data: {
      expirationDate: expirationDate ? new Date(expirationDate) : null,
      customerId: customer.id,
      customerName: displayName(customer),
      customerEmail: customer.email,
      customerEmail2: customer.email2,
      customerBillingSnapshot: {
        street: customer.billingStreet,
        street2: customer.billingStreet2,
        city: customer.billingCity,
        state: customer.billingState,
        zip: customer.billingZip,
      },
      customerShippingSnapshot: {
        street: customer.shippingStreet,
        street2: customer.shippingStreet2,
        city: customer.shippingCity,
        state: customer.shippingState,
        zip: customer.shippingZip,
      },
      subtotal,
      shippingCharge,
      tax,
      total,
      notes: notes || null,
      createdByUserId: session.user.id,
      lines: { create: lineData },
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      action: "Estimate saved",
      entityType: "Estimate",
      entityId: estimate.id,
      details: { number: estimate.number, total },
    },
  });

  return Response.json({ id: estimate.id, number: estimate.number }, { status: 201 });
}
