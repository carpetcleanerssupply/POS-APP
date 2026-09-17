import { paymentMethodLabel } from "@/lib/payments";

// Maps invoiceId -> the real payments (never credit-consumption, never voided)
// that funded it, in the order they were received. Used to describe HOW an
// invoice got paid, e.g. "$50.00 Check #1042 + $25.00 Cash".
function paymentSourcesByInvoice(payments) {
  const map = {};
  payments
    .filter((p) => !p.voided)
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach((p) => {
      p.applications.forEach((a) => {
        (map[a.invoiceId] ||= []).push({ method: p.method, checkNumber: p.checkNumber, amount: Number(a.amountApplied) });
      });
    });
  return map;
}

function paymentLabelFor(invoice, sources) {
  if (!sources || sources.length === 0) {
    if (invoice.paymentMethod === "ACCOUNT" || !invoice.paymentMethod) return "Charged to account";
    return paymentMethodLabel(invoice.paymentMethod, invoice.checkNumber);
  }
  const breakdown =
    sources.length === 1
      ? paymentMethodLabel(sources[0].method, sources[0].checkNumber)
      : sources.map((s) => `$${s.amount.toFixed(2)} ${paymentMethodLabel(s.method, s.checkNumber)}`).join(" + ");
  const fullyPaid = Number(invoice.paidAmount) >= Number(invoice.total) - 0.005;
  return fullyPaid
    ? breakdown
    : `Partial: ${breakdown} received — $${(Number(invoice.total) - Number(invoice.paidAmount)).toFixed(2)} still owed`;
}

// One unified, chronological account ledger — every invoice charge, payment,
// credit application, and return, each showing exactly what it did to the
// balance. Mirrors the prototype's statementLedger exactly, including which
// events get skipped (credit-consumption and at-sale payment records never
// get their own row, since the money they represent is already shown
// elsewhere) so the running balance always lands on the true current
// balance.
export function buildStatementLedger({ invoices, payments, returns, estimates }) {
  const entries = [];
  const invoiceNumberById = Object.fromEntries(invoices.map((inv) => [inv.id, inv.number]));
  const sourcesByInvoice = paymentSourcesByInvoice(payments);

  for (const inv of invoices) {
    if (inv.status === "DRAFT") continue;
    if (inv.settledTo === "ACCOUNT") {
      entries.push({ key: `inv-${inv.id}`, date: inv.date, description: `Invoice #${inv.number}`, amount: Number(inv.total) });
    } else {
      entries.push({
        key: `inv-${inv.id}`,
        date: inv.date,
        description: `Invoice #${inv.number} — paid in full via ${paymentLabelFor(inv, sourcesByInvoice[inv.id])}`,
        amount: 0,
        displayAmount: Number(inv.total),
      });
    }
  }

  for (const p of payments) {
    // A credit-consumption record is a reallocation of money already counted
    // in full when the original payment came in — a second row here would
    // show the same dollars twice.
    if (p.method === "CREDIT") continue;
    // An at-sale record is the payment behind a paid-now invoice — that
    // invoice's own "paid in full" line already represents this money.
    if (p.atSale) continue;

    const label = paymentMethodLabel(p.method, p.checkNumber);
    if (p.voided) {
      entries.push({ key: `pmt-${p.id}`, date: p.date, description: `${label} received — VOIDED`, amount: 0 });
      continue;
    }
    const targets = p.applications.map((a) => `$${Number(a.amountApplied).toFixed(2)} to Invoice #${invoiceNumberById[a.invoiceId] ?? "?"}`);
    if (Number(p.unapplied) > 0.005) targets.push(`$${Number(p.unapplied).toFixed(2)} credit`);
    const description = targets.length > 0 ? `${label} received — ${targets.join(", ")}` : `${label} received`;
    entries.push({ key: `pmt-${p.id}`, date: p.date, description, amount: -Number(p.amount) });
  }

  for (const r of returns) {
    if (r.refundMethod !== "ACCOUNT") continue;
    const invoiceNumber = invoiceNumberById[r.originalInvoiceId] ?? "?";
    if (r.voided) {
      entries.push({ key: `ret-${r.id}`, date: r.date, description: `Return #${r.number} (against Invoice #${invoiceNumber}) — VOIDED`, amount: 0 });
      continue;
    }
    entries.push({ key: `ret-${r.id}`, date: r.date, description: `Return #${r.number} (against Invoice #${invoiceNumber})`, amount: -Number(r.total) });
  }

  for (const e of estimates) {
    const resultingInvoice = e.status === "CONVERTED" ? invoices.find((inv) => inv.convertedFromEstimateId === e.id) : null;
    const description =
      resultingInvoice
        ? `Estimate #${e.number} ($${Number(e.total).toFixed(2)}) — converted to Invoice #${resultingInvoice.number}`
        : e.status === "CONVERTED"
        ? `Estimate #${e.number} ($${Number(e.total).toFixed(2)}) — converted`
        : `Estimate #${e.number} sent ($${Number(e.total).toFixed(2)})`;
    entries.push({ key: `est-${e.id}`, date: e.date, description, amount: 0 });
  }

  entries.sort((a, b) => new Date(a.date) - new Date(b.date));
  let balance = 0;
  const withBalance = entries.map((e) => {
    balance += e.amount;
    return { ...e, balance };
  });
  return withBalance.reverse();
}
