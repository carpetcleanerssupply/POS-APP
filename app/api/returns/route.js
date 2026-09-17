import { prisma } from "@/lib/prisma";
import { requireSessionJson } from "@/lib/auth";
import { displayName } from "@/lib/customers";

const REFUND_METHODS = new Set(["ACCOUNT", "CARD", "CHECK", "CASH"]);

export async function POST(request) {
  const { session, unauthorized } = await requireSessionJson();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request body." }, { status: 400 });

  const { invoiceId, lines: rawLines = [], refundMethod, checkNumber = "", reason = "" } = body;

  if (!invoiceId) return Response.json({ error: "Select an invoice to return against." }, { status: 400 });
  if (!REFUND_METHODS.has(refundMethod)) return Response.json({ error: "Choose a refund method." }, { status: 400 });
  if (refundMethod === "CHECK" && !checkNumber.trim()) {
    return Response.json({ error: "Enter a check number." }, { status: 400 });
  }

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, include: { lines: true } });
  if (!invoice || invoice.status !== "CLOSED") {
    return Response.json({ error: "That invoice isn't available to return against." }, { status: 404 });
  }

  // Voided returns don't count against how much of a line has already come
  // back — voiding one puts the stock back and should free that quantity up
  // to be returned again.
  const priorReturns = await prisma.return.findMany({
    where: { originalInvoiceId: invoiceId, voided: false },
    include: { lines: true },
  });
  const alreadyReturned = {};
  for (const r of priorReturns) {
    for (const l of r.lines) {
      alreadyReturned[l.itemId] = (alreadyReturned[l.itemId] || 0) + l.qty;
    }
  }

  const toReturn = [];
  for (const raw of rawLines) {
    const qty = Math.floor(Number(raw.qty) || 0);
    if (qty <= 0) continue;
    const invLine = invoice.lines.find((l) => l.itemId === raw.itemId);
    if (!invLine) continue;
    const maxReturnable = invLine.qty - (alreadyReturned[invLine.itemId] || 0);
    if (qty > maxReturnable) {
      return Response.json(
        { error: `Can't return ${qty} of ${invLine.name} — only ${maxReturnable} eligible.` },
        { status: 400 }
      );
    }
    const unitPrice = invLine.qty > 0 ? Number(invLine.ext) / invLine.qty : 0;
    toReturn.push({
      itemId: invLine.itemId,
      sku: invLine.sku,
      name: invLine.name,
      qty,
      price: unitPrice,
      ext: unitPrice * qty,
    });
  }

  if (toReturn.length === 0) {
    return Response.json({ error: "Enter a quantity to return for at least one item." }, { status: 400 });
  }

  const total = toReturn.reduce((sum, l) => sum + l.ext, 0);
  const creditingAccount = refundMethod === "ACCOUNT";

  const created = await prisma.$transaction(async (tx) => {
    for (const line of toReturn) {
      if (!line.itemId) continue;
      await tx.item.update({ where: { id: line.itemId }, data: { stock: { increment: line.qty } } });
    }

    const record = await tx.return.create({
      data: {
        originalInvoiceId: invoice.id,
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        total,
        refundMethod,
        checkNumber: refundMethod === "CHECK" ? checkNumber.trim() : null,
        reason: reason.trim() || null,
        processedByUserId: session.user.id,
        lines: { create: toReturn },
      },
    });

    if (creditingAccount) {
      await tx.customer.update({ where: { id: invoice.customerId }, data: { balance: { decrement: total } } });
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { paidAmount: Math.min(Number(invoice.total), Number(invoice.paidAmount) + total) },
      });
    }

    await tx.activityLog.create({
      data: {
        userId: session.user.id,
        action: "Return processed",
        entityType: "Return",
        entityId: record.id,
        details: { total, refundMethod, invoiceNumber: invoice.number },
      },
    });

    return record;
  });

  return Response.json({ id: created.id }, { status: 201 });
}
