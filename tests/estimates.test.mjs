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

describe("estimates", () => {
  let session;

  before(async () => {
    await ensureTestUsers();
    session = await loginAs("_test_owner", "test-owner-pw-123");
  });

  after(async () => {
    await cleanupAllTestData();
  });

  test("an estimate never touches stock or balance", async () => {
    const item = await createTestItem({ price: 50, stock: 10 });
    const customer = await createTestCustomer();

    const { res } = await session.json("/api/estimates", {
      method: "POST",
      body: JSON.stringify({ customerId: customer.id, lines: [{ itemId: item.id, qty: 2 }] }),
    });
    assert.equal(res.status, 201);

    const itemRow = await prisma.item.findUnique({ where: { id: item.id } });
    assert.equal(itemRow.stock, 10);
    const customerRow = await prisma.customer.findUnique({ where: { id: customer.id } });
    assert.equal(Number(customerRow.balance), 0);
  });

  test("converting an estimate to an invoice links them and marks the estimate CONVERTED, and can't be converted twice", async () => {
    const item = await createTestItem({ price: 50, stock: 10 });
    const customer = await createTestCustomer();

    const { data: estimate } = await session.json("/api/estimates", {
      method: "POST",
      body: JSON.stringify({ customerId: customer.id, lines: [{ itemId: item.id, qty: 1 }] }),
    });

    const { res: convertRes, data: invoice } = await session.json("/api/invoices", {
      method: "POST",
      body: JSON.stringify({
        customerId: customer.id,
        estimateId: estimate.id,
        lines: [{ itemId: item.id, qty: 1 }],
        settledTo: "PAID_NOW",
        paymentMethod: "CARD",
      }),
    });
    assert.equal(convertRes.status, 201);

    const estimateRow = await prisma.estimate.findUnique({ where: { id: estimate.id } });
    assert.equal(estimateRow.status, "CONVERTED");
    const invoiceRow = await prisma.invoice.findUnique({ where: { id: invoice.id } });
    assert.equal(invoiceRow.convertedFromEstimateId, estimate.id);

    const { res: secondConvertRes, data: secondConvertData } = await session.json("/api/invoices", {
      method: "POST",
      body: JSON.stringify({
        customerId: customer.id,
        estimateId: estimate.id,
        lines: [{ itemId: item.id, qty: 1 }],
        settledTo: "PAID_NOW",
        paymentMethod: "CARD",
      }),
    });
    assert.equal(secondConvertRes.status, 400);
    assert.match(secondConvertData.error, /already been converted/);
  });

  test("a converted estimate can no longer be edited or deleted", async () => {
    const item = await createTestItem({ price: 50, stock: 10 });
    const customer = await createTestCustomer();
    const { data: estimate } = await session.json("/api/estimates", {
      method: "POST",
      body: JSON.stringify({ customerId: customer.id, lines: [{ itemId: item.id, qty: 1 }] }),
    });
    await session.json("/api/invoices", {
      method: "POST",
      body: JSON.stringify({
        customerId: customer.id,
        estimateId: estimate.id,
        lines: [{ itemId: item.id, qty: 1 }],
        settledTo: "PAID_NOW",
        paymentMethod: "CARD",
      }),
    });

    const { res: editRes, data: editData } = await session.json(`/api/estimates/${estimate.id}`, {
      method: "POST",
      body: JSON.stringify({ lines: [{ itemId: item.id, qty: 2 }] }),
    });
    assert.equal(editRes.status, 400);
    assert.match(editData.error, /converted/);

    const { res: deleteRes, data: deleteData } = await session.json(`/api/estimates/${estimate.id}/delete`, { method: "POST" });
    assert.equal(deleteRes.status, 400);
    assert.match(deleteData.error, /converted/);
  });
});
