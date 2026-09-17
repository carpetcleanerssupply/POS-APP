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

describe("invoices", () => {
  let session;

  before(async () => {
    await ensureTestUsers();
    session = await loginAs("_test_owner", "test-owner-pw-123");
  });

  after(async () => {
    await cleanupAllTestData();
  });

  test("closing a paid-now invoice decrements stock and records an at-sale payment", async () => {
    const item = await createTestItem({ stock: 10, price: 50 });
    const customer = await createTestCustomer();

    const { res, data } = await session.json("/api/invoices", {
      method: "POST",
      body: JSON.stringify({
        customerId: customer.id,
        saleType: "WALKIN",
        lines: [{ itemId: item.id, qty: 3 }],
        settledTo: "PAID_NOW",
        paymentMethod: "CARD",
      }),
    });
    assert.equal(res.status, 201);

    const updatedItem = await prisma.item.findUnique({ where: { id: item.id } });
    assert.equal(updatedItem.stock, 7);

    const payment = await prisma.payment.findFirst({ where: { customerId: customer.id } });
    assert.equal(Number(payment.amount), 150);
    assert.equal(payment.atSale, true);

    const invoice = await prisma.invoice.findUnique({ where: { id: data.id } });
    assert.equal(Number(invoice.paidAmount), 150);
    assert.equal(invoice.status, "CLOSED");
  });

  test("charging to account increments the customer's balance by the full total", async () => {
    const item = await createTestItem({ stock: 10, price: 100 });
    const customer = await createTestCustomer();

    const { res } = await session.json("/api/invoices", {
      method: "POST",
      body: JSON.stringify({
        customerId: customer.id,
        saleType: "PHONE",
        lines: [{ itemId: item.id, qty: 1 }],
        settledTo: "ACCOUNT",
      }),
    });
    assert.equal(res.status, 201);

    const updatedCustomer = await prisma.customer.findUnique({ where: { id: customer.id } });
    assert.equal(Number(updatedCustomer.balance), 100);
  });

  test("a deposit on an account charge only increments balance by total minus the deposit", async () => {
    const item = await createTestItem({ stock: 10, price: 100 });
    const customer = await createTestCustomer();

    const { res } = await session.json("/api/invoices", {
      method: "POST",
      body: JSON.stringify({
        customerId: customer.id,
        saleType: "PHONE",
        lines: [{ itemId: item.id, qty: 1 }],
        settledTo: "ACCOUNT",
        depositAmount: 30,
        depositMethod: "CASH",
      }),
    });
    assert.equal(res.status, 201);

    const updatedCustomer = await prisma.customer.findUnique({ where: { id: customer.id } });
    assert.equal(Number(updatedCustomer.balance), 70);

    const deposit = await prisma.payment.findFirst({ where: { customerId: customer.id, method: "CASH" } });
    assert.equal(Number(deposit.amount), 30);
    assert.equal(deposit.atSale, false);
  });

  test("can't sell more than what's in stock", async () => {
    const item = await createTestItem({ stock: 2 });
    const customer = await createTestCustomer();

    const { res, data } = await session.json("/api/invoices", {
      method: "POST",
      body: JSON.stringify({
        customerId: customer.id,
        lines: [{ itemId: item.id, qty: 999 }],
        settledTo: "PAID_NOW",
        paymentMethod: "CARD",
      }),
    });
    assert.equal(res.status, 400);
    assert.match(data.error, /Not enough stock/);

    const unchangedItem = await prisma.item.findUnique({ where: { id: item.id } });
    assert.equal(unchangedItem.stock, 2);
  });

  test("a walk-in customer can't be charged to account", async () => {
    const item = await createTestItem();
    const customer = await createTestCustomer({ isWalkIn: true });

    const { res, data } = await session.json("/api/invoices", {
      method: "POST",
      body: JSON.stringify({
        customerId: customer.id,
        lines: [{ itemId: item.id, qty: 1 }],
        settledTo: "ACCOUNT",
      }),
    });
    assert.equal(res.status, 400);
    assert.match(data.error, /walk-in/);
  });

  test("a draft never touches stock or balance until it's closed, and closing re-validates stock", async () => {
    const item = await createTestItem({ stock: 5 });
    const customer = await createTestCustomer();

    const { res: draftRes, data: draft } = await session.json("/api/invoices", {
      method: "POST",
      body: JSON.stringify({
        customerId: customer.id,
        saveAsDraft: true,
        lines: [{ itemId: item.id, qty: 999 }], // more than in stock — fine for a draft
      }),
    });
    assert.equal(draftRes.status, 201);

    const stockAfterDraft = await prisma.item.findUnique({ where: { id: item.id } });
    assert.equal(stockAfterDraft.stock, 5, "draft must not touch stock");

    const { res: badCloseRes } = await session.json(`/api/invoices/${draft.id}/close`, {
      method: "POST",
      body: JSON.stringify({
        lines: [{ itemId: item.id, qty: 999 }],
        settledTo: "PAID_NOW",
        paymentMethod: "CARD",
      }),
    });
    assert.equal(badCloseRes.status, 400, "closing with insufficient stock must fail");

    const { res: goodCloseRes } = await session.json(`/api/invoices/${draft.id}/close`, {
      method: "POST",
      body: JSON.stringify({
        lines: [{ itemId: item.id, qty: 2 }],
        settledTo: "PAID_NOW",
        paymentMethod: "CARD",
      }),
    });
    assert.equal(goodCloseRes.status, 200);

    const closedInvoice = await prisma.invoice.findUnique({ where: { id: draft.id } });
    assert.equal(closedInvoice.status, "CLOSED");
    const stockAfterClose = await prisma.item.findUnique({ where: { id: item.id } });
    assert.equal(stockAfterClose.stock, 3);
  });

  test("only a draft invoice can be deleted", async () => {
    const item = await createTestItem();
    const customer = await createTestCustomer();

    const { data: closed } = await session.json("/api/invoices", {
      method: "POST",
      body: JSON.stringify({
        customerId: customer.id,
        lines: [{ itemId: item.id, qty: 1 }],
        settledTo: "PAID_NOW",
        paymentMethod: "CARD",
      }),
    });

    const { res, data } = await session.json(`/api/invoices/${closed.id}/delete`, { method: "POST" });
    assert.equal(res.status, 400);
    assert.match(data.error, /draft/);
  });
});
