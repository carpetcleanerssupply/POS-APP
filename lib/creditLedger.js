import { paymentMethodLabel } from "@/lib/payments";

// A customer's spendable credit isn't stored anywhere directly — it's derived
// by replaying history: every non-voided real payment (card/check/cash) that
// left money unapplied at the time it was recorded is a "source", and every
// later credit-consumption payment (method CREDIT) draws down those sources
// oldest-first. This mirrors the prototype's buildCreditLedger exactly so the
// "available credit" figure shown to staff always matches what a new
// Apply-Credit action would actually be able to draw on.
export function buildCreditLedger(payments) {
  const sources = payments
    .filter((p) => p.method !== "CREDIT" && !p.voided && Number(p.unapplied) > 0.005)
    .map((p) => ({ id: p.id, label: paymentMethodLabel(p.method, p.checkNumber), remaining: Number(p.unapplied), date: p.date }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const consumptions = payments
    .filter((p) => p.method === "CREDIT" && !p.voided)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  for (const c of consumptions) {
    let remaining = Number(c.amount);
    for (const s of sources) {
      if (remaining <= 0.005) break;
      const take = Math.min(s.remaining, remaining);
      s.remaining -= take;
      remaining -= take;
    }
  }

  return sources.filter((s) => s.remaining > 0.005);
}

// Walks the ledger oldest-first and returns a short label of which payment(s)
// funded a credit-consumption, e.g. "Check #1042 + Cash".
export function describeCreditSources(sources, amount) {
  let remaining = amount;
  const used = [];
  for (const s of sources) {
    if (remaining <= 0.005) break;
    const take = Math.min(s.remaining, remaining);
    if (take > 0.005) used.push(s.label);
    remaining -= take;
  }
  return used.join(" + ") || "prior overpayment";
}
