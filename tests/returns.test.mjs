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

describe("returns", () => {
  let session;

  before(async () => {
    await ensureTestUsers();
    session = await loginAs("_test_owner", "test-owner-pw-123");
  });

  after(async () => {
    await cleanupAllTestData();
  });

  test("an account-credit return restocks the item and credits the balance, and voiding it reverses both", async () => {
    const item = await createTestItem({ price: 100, stock: 10 });
    const customer = await createTestCustomer();

    const { data: invoice } = await session.json("/api/invoices", {
      method: "POST",
      body: JSON.stringify({ customerId: customer.id, lines: [{ itemId: item.id, qty: 2 }], settledTo: "ACCOUNT" }),
    });

    let itemRow = await prisma.item.findUnique({ where: { id: item.id } });
    assert.equal(itemRow.stock, 8);

    const { res: returnRes, data: ret } = await session.json("/api/returns", {
      method: "POST",
      body: JSON.stringify({
        invoiceId: invoice.id,
        lines: [{ itemId: item.id, qty: 1 }],
        refundMethod: "ACCOUNT",
      }),
    });
    assert.equal(returnRes.status, 201);

    itemRow = await prisma.item.findUnique({ where: { id: item.id } });
    assert.equal(itemRow.stock, 9, "returned unit should go back on the shelf");

    let customerRow = await prisma.customer.findUnique({ where: { id: customer.id } });
    assert.equal(Number(customerRow.balance), 100, "200 charge minus 100 credited return");

    const { res: voidRes } = await session.json(`/api/returns/${ret.id}/void`, { method: "POST" });
    assert.equal(voidRes.status, 200);

    itemRow = await prisma.item.findUnique({ where: { id: item.id } });
    assert.equal(itemRow.stock, 8, "voiding should take the stock back off the shelf");

    customerRow = await prisma.customer.findUnique({ where: { id: customer.id } });
    assert.equal(Number(customerRow.balance), 200, "voiding should restore the full charge");
  });

  test("a voided return doesn't block the same quantity from being returned again", async () => {
    const item = await createTestItem({ price: 50, stock: 10 });
    const customer = await createTestCustomer();

    const { data: invoice } = await session.json("/api/invoices", {
      method: "POST",
      body: JSON.stringify({ customerId: customer.id, lines: [{ itemId: item.id, qty: 1 }], settledTo: "PAID_NOW", paymentMethod: "CASH" }),
    });

    const { data: ret } = await session.json("/api/returns", {
      method: "POST",
      body: JSON.stringify({ invoiceId: invoice.id, lines: [{ itemId: item.id, qty: 1 }], refundMethod: "CASH" }),
    });
    await session.json(`/api/returns/${ret.id}/void`, { method: "POST" });

    const { res } = await session.json("/api/returns", {
      method: "POST",
      body: JSON.stringify({ invoiceId: invoice.id, lines: [{ itemId: item.id, qty: 1 }], refundMethod: "CASH" }),
    });
    assert.equal(res.status, 201, "the voided return must not count against how much is eligible to return");
  });

  test("can't return more than what's eligible", async () => {
    const item = await createTestItem({ price: 50, stock: 10 });
    const customer = await createTestCustomer();
    const { data: invoice } = await session.json("/api/invoices", {
      method: "POST",
      body: JSON.stringify({ customerId: customer.id, lines: [{ itemId: item.id, qty: 1 }], settledTo: "PAID_NOW", paymentMethod: "CASH" }),
    });

    const { res, data } = await session.json("/api/returns", {
      method: "POST",
      body: JSON.stringify({ invoiceId: invoice.id, lines: [{ itemId: item.id, qty: 5 }], refundMethod: "CASH" }),
    });
    assert.equal(res.status, 400);
    assert.match(data.error, /eligible/);
  });
});
