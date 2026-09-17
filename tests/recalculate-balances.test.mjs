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

describe("recalculate balances", () => {
  let session;

  before(async () => {
    await ensureTestUsers();
    session = await loginAs("_test_owner", "test-owner-pw-123");
  });

  after(async () => {
    await cleanupAllTestData();
  });

  test("rebuilds a deliberately corrupted balance back to the value derived from real transaction history", async () => {
    const item = await createTestItem({ price: 100, stock: 10 });
    const customer = await createTestCustomer();

    await session.json("/api/invoices", {
      method: "POST",
      body: JSON.stringify({ customerId: customer.id, lines: [{ itemId: item.id, qty: 1 }], settledTo: "ACCOUNT" }),
    });

    // Simulate drift the same way this was verified manually during development.
    await prisma.customer.update({ where: { id: customer.id }, data: { balance: 99999 } });

    const { res } = await session.json("/api/admin/recalculate-balances", { method: "POST" });
    assert.equal(res.status, 200);

    const customerRow = await prisma.customer.findUnique({ where: { id: customer.id } });
    assert.equal(Number(customerRow.balance), 100, "recalculation should restore the true balance from history");
  });
});
