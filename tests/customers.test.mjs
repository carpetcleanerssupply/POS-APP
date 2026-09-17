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

describe("customers", () => {
  let session;

  before(async () => {
    await ensureTestUsers();
    session = await loginAs("_test_owner", "test-owner-pw-123");
  });

  after(async () => {
    await cleanupAllTestData();
  });

  test("a customer with a non-zero balance can't be deleted", async () => {
    const customer = await createTestCustomer();
    await prisma.customer.update({ where: { id: customer.id }, data: { balance: 42.5 } });

    const res = await session.form(`/api/customers/${customer.id}/delete`, {});
    assert.match(res.headers.get("location"), /error=has_balance/);

    const stillThere = await prisma.customer.findUnique({ where: { id: customer.id } });
    assert.ok(stillThere);
  });

  test("a customer with invoice/estimate history can't be deleted even at a zero balance", async () => {
    const item = await createTestItem({ price: 50, stock: 10 });
    const customer = await createTestCustomer();
    await session.json("/api/invoices", {
      method: "POST",
      body: JSON.stringify({ customerId: customer.id, lines: [{ itemId: item.id, qty: 1 }], settledTo: "PAID_NOW", paymentMethod: "CASH" }),
    });

    const res = await session.form(`/api/customers/${customer.id}/delete`, {});
    assert.match(res.headers.get("location"), /error=has_history/);
  });

  test("a customer with no balance or history can be deleted", async () => {
    const customer = await createTestCustomer();
    const res = await session.form(`/api/customers/${customer.id}/delete`, {});
    assert.doesNotMatch(res.headers.get("location") || "", /error=/);

    const gone = await prisma.customer.findUnique({ where: { id: customer.id } });
    assert.equal(gone, null);
  });

  test("a customer needs a company name or a contact name", async () => {
    const res = await session.form("/api/customers", { email: "nobody@example.com" });
    assert.match(res.headers.get("location"), /error=required/);
  });

  test("checking Ship Same As Billing copies the billing address to shipping", async () => {
    const res = await session.form("/api/customers", {
      company: `_Test Customer ${Date.now()}`,
      billingStreet: "123 Main St",
      billingCity: "Portland",
      billingState: "OR",
      billingZip: "97201",
      shipSameAsBilling: "on",
    });
    assert.equal(res.status, 303);
    const location = res.headers.get("location");
    const id = location.match(/\/customers\/([^/]+)\/edit/)[1];

    const customer = await prisma.customer.findUnique({ where: { id } });
    assert.equal(customer.shippingStreet, "123 Main St");
    assert.equal(customer.shippingCity, "Portland");
  });
});
