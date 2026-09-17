import { prisma } from "@/lib/prisma";
import { requireSessionJson } from "@/lib/auth";
import { TAX_RATE, buildInvoiceLines, settleInvoiceMoney, InvoiceValidationError } from "@/lib/invoices";

const NON_ACCOUNT_METHODS = new Set(["CARD", "CHECK", "CASH"]);
const DEPOSIT_METHODS = new Set(["CARD", "CHECK", "CASH"]);

// Closes an existing draft for real: re-validates and re-decrements stock for
// its (possibly just-edited) lines, collects the settlement decision, and
// runs the exact same money logic as closing a brand-new invoice.
export async function POST(request, { params }) {
  const { session, unauthorized } = await requireSessionJson();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request body." }, { status: 400 });

  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) return Response.json({ error: "That invoice no longer exists." }, { status: 404 });
  if (invoice.status !== "DRAFT") return Response.json({ error: "This invoice is already closed." }, { status: 400 });

  const {
    lines: rawLines = [],
    shippingCharge: rawShippingCharge = 0,
    settledTo,
    paymentMethod,
    checkNumber = "",
    depositAmount: rawDepositAmount = 0,
    depositMethod,
    depositCheckNumber = "",
  } = body;

  const dedupedLines = (rawLines || []).filter((l) => l && l.itemId && Number(l.qty) > 0);
  if (dedupedLines.length === 0) {
    return Response.json({ error: "Add at least one line item with a quantity greater than 0." }, { status: 400 });
  }
  if (settledTo !== "PAID_NOW" && settledTo !== "ACCOUNT") {
    return Response.json({ error: "Choose how this invoice is settled." }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({ where: { id: invoice.customerId } });
  if (!customer) return Response.json({ error: "This invoice's customer no longer exists." }, { status: 400 });

  const chargingAccount = settledTo === "ACCOUNT";
  if (chargingAccount && customer.isWalkIn) {
    return Response.json(
      { error: "A walk-in customer must be marked paid — it can't be charged to account." },
      { status: 400 }
    );
  }
  if (!chargingAccount) {
    if (!NON_ACCOUNT_METHODS.has(paymentMethod)) {
      return Response.json({ error: "Choose a payment method (Card, Check, or Cash)." }, { status: 400 });
    }
    if (paymentMethod === "CHECK" && !checkNumber.trim()) {
      return Response.json({ error: "A check number is required for check payments." }, { status: 400 });
    }
  }

  const depositAmount = chargingAccount ? Math.max(0, Number(rawDepositAmount) || 0) : 0;
  if (depositAmount > 0.005) {
    if (!DEPOSIT_METHODS.has(depositMethod)) {
      return Response.json({ error: "Choose a payment method for the deposit." }, { status: 400 });
    }
    if (depositMethod === "CHECK" && !depositCheckNumber.trim()) {
      return Response.json({ error: "A check number is required for the deposit." }, { status: 400 });
    }
  }

  const shippingCharge = Math.max(0, Number(rawShippingCharge) || 0);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const { lineData, subtotal } = await buildInvoiceLines(tx, dedupedLines, { decrementStock: true });
      const tax = customer.taxExempt ? 0 : subtotal * TAX_RATE;
      const total = subtotal + shippingCharge + tax;

      if (depositAmount > total) {
        throw new InvoiceValidationError("The deposit can't be more than the invoice total.");
      }

      await tx.invoiceLine.deleteMany({ where: { invoiceId: id } });
      const updated = await tx.invoice.update({
        where: { id },
        data: {
          status: "CLOSED",
          subtotal,
          shippingCharge,
          tax,
          total,
          paymentMethod: chargingAccount ? "ACCOUNT" : paymentMethod,
          checkNumber: !chargingAccount && paymentMethod === "CHECK" ? checkNumber.trim() : null,
          settledTo,
          paidAmount: 0,
          lines: { create: lineData },
        },
      });

      const paidAmount = await settleInvoiceMoney(tx, {
        invoice: updated,
        customer,
        session,
        chargingAccount,
        total,
        paymentMethod,
        checkNumber,
        depositAmount,
        depositMethod,
        depositCheckNumber,
      });
      await tx.invoice.update({ where: { id: updated.id }, data: { paidAmount } });

      await tx.activityLog.create({
        data: {
          userId: session.user.id,
          action: "Invoice closed",
          entityType: "Invoice",
          entityId: updated.id,
          details: { number: updated.number, total, settledTo },
        },
      });

      return updated;
    });

    return Response.json({ id: result.id, number: result.number }, { status: 200 });
  } catch (error) {
    if (error instanceof InvoiceValidationError) return Response.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
