// Oregon — no sales tax today, kept as a rate so other locales just change this.
export const TAX_RATE = 0.0;

export function lineExt(price, qty, discountPct) {
  const gross = Number(price) * qty;
  const pct = Math.min(100, Math.max(0, Number(discountPct) || 0));
  return gross - gross * (pct / 100);
}

export class InvoiceValidationError extends Error {}
