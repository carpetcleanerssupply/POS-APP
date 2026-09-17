import { prisma } from "@/lib/prisma";
import { requireSessionJson } from "@/lib/auth";
import { TAX_RATE, buildInvoiceLines, settleInvoiceMoney, InvoiceValidationError } from "@/lib/invoices";
import { displayName } from "@/lib/customers";

const NON_ACCOUNT_METHODS = new Set(["CARD", "CHECK", "CASH"]);
const DEPOSIT_METHODS = new Set(["CARD", "CHECK", "CASH"]);

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
    dueDate = null,
    estimateId = null,
    saveAsDraft = false,
    depositAmount: rawDepositAmount = 0,
    depositMethod,
    depositCheckNumber = "",
  } = body;

  if (!customerId) return Response.json({ error: "Select a customer." }, { status: 400 });
  const dedupedLines = (rawLines || []).filter((l) => l && l.itemId && Number(l.qty) > 0);
  if (dedupedLines.length === 0) {
    return Response.json({ error: "Add at least one line item with a quantity greater than 0." }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return Response.json({ error: "That customer no longer exists." }, { status: 404 });

  if (estimateId) {
    const estimate = await prisma.estimate.findUnique({ where: { id: estimateId } });
    if (!estimate) return Response.json({ error: "That estimate no longer exists." }, { status: 404 });
    if (estimate.status !== "OPEN") {
      return Response.json({ error: "That estimate has already been converted." }, { status: 400 });
    }
  }

  const shippingCharge = Math.max(0, Number(rawShippingCharge) || 0);

  // A draft is just a placeholder — nothing about payment is decided yet, and
  // nothing gets committed to stock or the customer's balance until it's
  // closed for real.
  if (saveAsDraft) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const { lineData, subtotal } = await buildInvoiceLines(tx, dedupedLines, { decrementStock: false });
        const tax = customer.taxExempt ? 0 : subtotal * TAX_RATE;
        const total = subtotal + shippingCharge + tax;

        const invoice = await tx.invoice.create({
          data: {
            status: "DRAFT",
            saleType,
            dueDate: dueDate ? new Date(dueDate) : null,
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
            subtotal,
            shippingCharge,
            tax,
            total,
            convertedFromEstimateId: estimateId || null,
            lines: { create: lineData },
          },
        });

        if (estimateId) {
          const converted = await tx.estimate.updateMany({
            where: { id: estimateId, status: "OPEN" },
            data: { status: "CONVERTED" },
          });
          if (converted.count === 0) throw new InvoiceValidationError("That estimate has already been converted.");
        }

        await tx.activityLog.create({
          data: {
            userId: session.user.id,
            action: "Invoice saved as draft",
            entityType: "Invoice",
            entityId: invoice.id,
            details: { number: invoice.number, total },
          },
        });

        return invoice;
      });

      return Response.json({ id: result.id, number: result.number }, { status: 201 });
    } catch (error) {
      if (error instanceof InvoiceValidationError) return Response.json({ error: error.message }, { status: 400 });
      throw error;
    }
  }

  // Closing for real — everything server-readiness-prep.md calls out applies.
  if (settledTo !== "PAID_NOW" && settledTo !== "ACCOUNT") {
    return Response.json({ error: "Choose how this invoice is settled." }, { status: 400 });
  }
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

  try {
    const result = await prisma.$transaction(async (tx) => {
      const { lineData, subtotal } = await buildInvoiceLines(tx, dedupedLines, { decrementStock: true });
      const tax = customer.taxExempt ? 0 : subtotal * TAX_RATE;
      const total = subtotal + shippingCharge + tax;

      if (depositAmount > total) {
        throw new InvoiceValidationError("The deposit can't be more than the invoice total.");
      }

      const invoice = await tx.invoice.create({
        data: {
          status: "CLOSED",
          saleType,
          dueDate: dueDate ? new Date(dueDate) : null,
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
          paidAmount: 0,
          convertedFromEstimateId: estimateId || null,
          lines: { create: lineData },
        },
        include: { lines: true },
      });

      if (estimateId) {
        const converted = await tx.estimate.updateMany({
          where: { id: estimateId, status: "OPEN" },
          data: { status: "CONVERTED" },
        });
        if (converted.count === 0) throw new InvoiceValidationError("That estimate has already been converted.");
      }

      const paidAmount = await settleInvoiceMoney(tx, {
        invoice,
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
      await tx.invoice.update({ where: { id: invoice.id }, data: { paidAmount } });

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
