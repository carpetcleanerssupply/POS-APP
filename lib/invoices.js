import { displayName } from "@/lib/customers";

// Oregon — no sales tax today, kept as a rate so other locales just change this.
export const TAX_RATE = 0.0;

export function lineExt(price, qty, discountPct) {
  const gross = Number(price) * qty;
  const pct = Math.min(100, Math.max(0, Number(discountPct) || 0));
  return gross - gross * (pct / 100);
}

export class InvoiceValidationError extends Error {}

// Builds line data with snapshot pricing. When `decrementStock` is true (a
// real close, not a draft save), each decrement is guarded — it only
// succeeds if stock is still >= qty at the moment of the write, so two staff
// closing invoices for the same item at once can't both succeed and oversell
// it. Drafts never touch stock at all, since nothing has actually been sold
// yet.
export async function buildInvoiceLines(tx, dedupedLines, { decrementStock }) {
  const lineData = [];
  let subtotal = 0;

  for (const raw of dedupedLines) {
    const item = await tx.item.findUnique({ where: { id: raw.itemId } });
    if (!item) throw new InvoiceValidationError(`An item on this invoice no longer exists.`);

    const qty = Math.floor(Number(raw.qty));
    if (qty <= 0) throw new InvoiceValidationError(`Invalid quantity for ${item.name}.`);

    if (decrementStock) {
      const decremented = await tx.item.updateMany({
        where: { id: item.id, stock: { gte: qty } },
        data: { stock: { decrement: qty } },
      });
      if (decremented.count === 0) {
        throw new InvoiceValidationError(`Not enough stock for ${item.name} (${item.stock} available).`);
      }
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

  return { lineData, subtotal };
}

// Applies the money side of closing an invoice: either the full balance is
// charged to the account (minus any deposit collected right now, which is
// real new money and gets its own payment record same as any other payment),
// or the full total is collected as a normal at-sale payment. Deposits on an
// account charge are NOT atSale — unlike a paid-now sale, an account invoice's
// full total already counts in the customer's charges, so a deposit against
// it must count as a normal payment for the balance math to net out.
export async function settleInvoiceMoney(
  tx,
  { invoice, customer, session, chargingAccount, total, paymentMethod, checkNumber, depositAmount = 0, depositMethod, depositCheckNumber }
) {
  if (chargingAccount) {
    const deposit = Math.max(0, Math.min(total, depositAmount || 0));
    await tx.customer.update({ where: { id: customer.id }, data: { balance: { increment: total - deposit } } });
    if (deposit > 0.005) {
      await tx.payment.create({
        data: {
          customerId: customer.id,
          customerName: displayName(customer),
          amount: deposit,
          method: depositMethod,
          checkNumber: depositMethod === "CHECK" ? depositCheckNumber.trim() : null,
          recordedByUserId: session.user.id,
          applications: { create: [{ invoiceId: invoice.id, amountApplied: deposit }] },
        },
      });
    }
    return deposit;
  }

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
  return total;
}
