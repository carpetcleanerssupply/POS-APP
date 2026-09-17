import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  prisma,
  loginAs,
  ensureTestUsers,
  createTestItem,
  createTestCustomer,
  cleanupAllTestData,
} from "./helpers.mjs";

describe("credit ledger", () => {
  let session;

  before(async () => {
    await ensureTestUsers();
    session = await loginAs("_test_owner", "test-owner-pw-123");
  });

  after(async () => {
    await cleanupAllTestData();
  });

  test("overpaying an invoice leaves the extra as unapplied credit, and applying it doesn't double-touch balance", async () => {
    const item = await createTestItem({ price: 100, stock: 10 });
    const customer = await createTestCustomer();

    // Charge $100 to account.
    await session.json("/api/invoices", {
      method: "POST",
      body: JSON.stringify({
        customerId: customer.id,
        lines: [{ itemId: item.id, qty: 1 }],
        settledTo: "ACCOUNT",
      }),
    });

    // Pay $150 by check — $50 should become unapplied credit.
    const { data: payment } = await session.json("/api/payments", {
      method: "POST",
      body: JSON.stringify({ customerId: customer.id, amount: 150, method: "CHECK", checkNumber: "1001" }),
    });

    let customerRow = await prisma.customer.findUnique({ where: { id: customer.id } });
    assert.equal(Number(customerRow.balance), -50, "overpayment should show as a $50 credit");

    const paymentRow = await prisma.payment.findUnique({ where: { id: payment.id } });
    assert.equal(Number(paymentRow.unapplied), 50);

    // A second $30 invoice, then apply the credit to it.
    const { data: invoice2 } = await session.json("/api/invoices", {
      method: "POST",
      body: JSON.stringify({
        customerId: customer.id,
        lines: [{ itemId: item.id, qty: 1, discountPct: 70 }],
        settledTo: "ACCOUNT",
      }),
    });

    customerRow = await prisma.customer.findUnique({ where: { id: customer.id } });
    assert.equal(Number(customerRow.balance), -20, "balance should just reflect the new $30 charge minus the $50 credit");

    const { res: applyRes } = await session.json("/api/payments/apply-credit", {
      method: "POST",
      body: JSON.stringify({ customerId: customer.id, invoiceIds: [invoice2.id] }),
    });
    assert.equal(applyRes.status, 201);

    customerRow = await prisma.customer.findUnique({ where: { id: customer.id } });
    assert.equal(Number(customerRow.balance), -20, "applying existing credit must not change balance again");

    const invoice2Row = await prisma.invoice.findUnique({ where: { id: invoice2.id } });
    assert.equal(Number(invoice2Row.paidAmount), 30, "invoice2 should now be fully paid via credit");
  });

  test("voiding a payment reverses the invoice paidAmount and the balance", async () => {
    const item = await createTestItem({ price: 100, stock: 10 });
    const customer = await createTestCustomer();

    const { data: invoice } = await session.json("/api/invoices", {
      method: "POST",
      body: JSON.stringify({ customerId: customer.id, lines: [{ itemId: item.id, qty: 1 }], settledTo: "ACCOUNT" }),
    });
    const { data: payment } = await session.json("/api/payments", {
      method: "POST",
      body: JSON.stringify({ customerId: customer.id, amount: 100, method: "CARD" }),
    });

    let customerRow = await prisma.customer.findUnique({ where: { id: customer.id } });
    assert.equal(Number(customerRow.balance), 0);

    const { res: voidRes } = await session.json(`/api/payments/${payment.id}/void`, { method: "POST" });
    assert.equal(voidRes.status, 200);

    customerRow = await prisma.customer.findUnique({ where: { id: customer.id } });
    assert.equal(Number(customerRow.balance), 100, "voiding should put the charge back on the books");

    const invoiceRow = await prisma.invoice.findUnique({ where: { id: invoice.id } });
    assert.equal(Number(invoiceRow.paidAmount), 0);
  });

  test("voiding an already-voided payment is rejected", async () => {
    const item = await createTestItem({ price: 50, stock: 10 });
    const customer = await createTestCustomer();
    await session.json("/api/invoices", {
      method: "POST",
      body: JSON.stringify({ customerId: customer.id, lines: [{ itemId: item.id, qty: 1 }], settledTo: "ACCOUNT" }),
    });
    const { data: payment } = await session.json("/api/payments", {
      method: "POST",
      body: JSON.stringify({ customerId: customer.id, amount: 50, method: "CARD" }),
    });

    await session.json(`/api/payments/${payment.id}/void`, { method: "POST" });
    const { res, data } = await session.json(`/api/payments/${payment.id}/void`, { method: "POST" });
    assert.equal(res.status, 400);
    assert.match(data.error, /already voided/);
  });
});
