import { prisma } from "@/lib/prisma";
import { requireSessionJson } from "@/lib/auth";
import { TAX_RATE, lineExt, InvoiceValidationError } from "@/lib/invoices";
import { displayName } from "@/lib/customers";

const NON_ACCOUNT_METHODS = new Set(["CARD", "CHECK", "CASH"]);

export async function POST(request) {
  const { session, unauthorized } = await requireSessionJson();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request body." }, { status: 400 });

  const {
    customerId,
    saleType = "WALKIN",
    customerPO = "",
    shipVia = "",
    trackingNumber = "",
    notes = "",
    shippingCharge: rawShippingCharge = 0,
    lines: rawLines = [],
    settledTo,
    paymentMethod,
    checkNumber = "",
  } = body;

  if (!customerId) return Response.json({ error: "Select a customer." }, { status: 400 });
  if (!Array.isArray(rawLines) || rawLines.length === 0) {
    return Response.json({ error: "Add at least one line item." }, { status: 400 });
  }
  if (settledTo !== "PAID_NOW" && settledTo !== "ACCOUNT") {
    return Response.json({ error: "Choose how this invoice is settled." }, { status: 400 });
  }

  const chargingAccount = settledTo === "ACCOUNT";
  const shippingCharge = Math.max(0, Number(rawShippingCharge) || 0);

  if (!chargingAccount) {
    if (!NON_ACCOUNT_METHODS.has(paymentMethod)) {
      return Response.json({ error: "Choose a payment method (Card, Check, or Cash)." }, { status: 400 });
    }
    if (paymentMethod === "CHECK" && !checkNumber.trim()) {
      return Response.json({ error: "A check number is required for check payments." }, { status: 400 });
    }
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return Response.json({ error: "That customer no longer exists." }, { status: 404 });

  if (chargingAccount && customer.isWalkIn) {
    return Response.json(
      { error: "A walk-in customer must be marked paid — it can't be charged to account." },
      { status: 400 }
    );
  }

  const dedupedLines = rawLines.filter((l) => l && l.itemId && Number(l.qty) > 0);
  if (dedupedLines.length === 0) {
    return Response.json({ error: "Add at least one line item with a quantity greater than 0." }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const lineData = [];
      let subtotal = 0;

      for (const raw of dedupedLines) {
        const item = await tx.item.findUnique({ where: { id: raw.itemId } });
        if (!item) throw new InvoiceValidationError(`An item on this invoice no longer exists.`);

        const qty = Math.floor(Number(raw.qty));
        if (qty <= 0) throw new InvoiceValidationError(`Invalid quantity for ${item.name}.`);

        // Guarded decrement: only succeeds if stock is still >= qty at the
        // moment of the write, so two staff closing invoices for the same
        // item at once can't both succeed and oversell it.
        const decremented = await tx.item.updateMany({
          where: { id: item.id, stock: { gte: qty } },
          data: { stock: { decrement: qty } },
        });
        if (decremented.count === 0) {
          throw new InvoiceValidationError(`Not enough stock for ${item.name} (${item.stock} available).`);
        }

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

      const tax = customer.taxExempt ? 0 : subtotal * TAX_RATE;
      const total = subtotal + shippingCharge + tax;
      const paidAmount = chargingAccount ? 0 : total;

      const invoice = await tx.invoice.create({
        data: {
          status: "CLOSED",
          saleType,
          customerPO: customerPO || null,
          shipVia: shipVia || null,
          trackingNumber: trackingNumber || null,
          notes: notes || null,
          employeeId: session.user.id,
          createdByUserId: session.user.id,
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
          paymentMethod: chargingAccount ? "ACCOUNT" : paymentMethod,
          checkNumber: !chargingAccount && paymentMethod === "CHECK" ? checkNumber.trim() : null,
          settledTo,
          paidAmount,
          lines: { create: lineData },
        },
        include: { lines: true },
      });

      if (chargingAccount) {
        await tx.customer.update({ where: { id: customer.id }, data: { balance: { increment: total } } });
      } else {
        await tx.payment.create({
          data: {
            customerId: customer.id,
            customerName: displayName(customer),
            amount: total,
            method: paymentMethod,
            checkNumber: paymentMethod === "CHECK" ? checkNumber.trim() : null,
            atSale: true,
            recordedByUserId: session.user.id,
            applications: { create: [{ invoiceId: invoice.id, amountApplied: total }] },
          },
        });
      }

      await tx.activityLog.create({
        data: {
          userId: session.user.id,
          action: "Invoice closed",
          entityType: "Invoice",
          entityId: invoice.id,
          details: { number: invoice.number, total, settledTo },
        },
      });

      return invoice;
    });

    return Response.json({ id: result.id, number: result.number }, { status: 201 });
  } catch (error) {
    if (error instanceof InvoiceValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
