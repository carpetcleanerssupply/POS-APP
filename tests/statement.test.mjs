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

describe("customer statement", () => {
  let session;

  before(async () => {
    await ensureTestUsers();
    session = await loginAs("_test_owner", "test-owner-pw-123");
  });

  after(async () => {
    await cleanupAllTestData();
  });

  test("the ledger's running balance matches the customer's actual stored balance across a mixed history", async () => {
    const item = await createTestItem({ price: 100, stock: 20 });
    const customer = await createTestCustomer();

    // $100 charged to account.
    await session.json("/api/invoices", {
      method: "POST",
      body: JSON.stringify({ customerId: customer.id, lines: [{ itemId: item.id, qty: 1 }], settledTo: "ACCOUNT" }),
    });
    // $200 paid-now sale (a wash, no balance impact).
    await session.json("/api/invoices", {
      method: "POST",
      body: JSON.stringify({ customerId: customer.id, lines: [{ itemId: item.id, qty: 2 }], settledTo: "PAID_NOW", paymentMethod: "CARD" }),
    });
    // Overpay by check: $150 against the $100 owed — $50 becomes credit.
    await session.json("/api/payments", {
      method: "POST",
      body: JSON.stringify({ customerId: customer.id, amount: 150, method: "CHECK", checkNumber: "9001" }),
    });
    // A second $30 charge (70% off a $100 item).
    const { data: invoice3 } = await session.json("/api/invoices", {
      method: "POST",
      body: JSON.stringify({ customerId: customer.id, lines: [{ itemId: item.id, qty: 1, discountPct: 70 }], settledTo: "ACCOUNT" }),
    });
    // Apply the leftover $50 credit to it.
    await session.json("/api/payments/apply-credit", {
      method: "POST",
      body: JSON.stringify({ customerId: customer.id, invoiceIds: [invoice3.id] }),
    });

    const customerRow = await prisma.customer.findUnique({ where: { id: customer.id } });
    const expectedBalance = Number(customerRow.balance);
    assert.equal(expectedBalance, -20, "sanity check on the scenario's expected math: 100 + 30 - 150 = -20");

    // Black-box, like every other test here: hit the real page and confirm
    // it renders the same balance the credit-ledger math produced in the
    // database, via the "Current Balance:" label so this can't accidentally
    // match some other dollar figure on the page.
    const statementRes = await session.fetch(`/customers/${customer.id}/statement`);
    assert.equal(statementRes.status, 200);
    // React SSR can insert <!-- --> between adjacent text nodes (e.g. a
    // literal "$" next to a {expression}) — strip comments before matching.
    const html = (await statementRes.text()).replace(/<!--.*?-->/g, "");
    const expectedStr = expectedBalance.toFixed(2).replace(".", "\\.");
    assert.match(
      html,
      new RegExp(`Current Balance:[\\s\\S]{0,80}\\$${expectedStr}`),
      `statement page should render "Current Balance: $${expectedBalance.toFixed(2)}"`
    );
  });
});
