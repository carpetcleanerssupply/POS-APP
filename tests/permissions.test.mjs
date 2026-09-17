import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  prisma,
  loginAs,
  ensureTestUsers,
  createTestItem,
  createTestCustomer,
  createTestVendor,
  cleanupAllTestData,
} from "./helpers.mjs";

describe("tier permissions", () => {
  let owner, staff;

  before(async () => {
    await ensureTestUsers();
    owner = await loginAs("_test_owner", "test-owner-pw-123");
    staff = await loginAs("_test_staff", "test-staff-pw-123");
  });

  after(async () => {
    await cleanupAllTestData();
  });

  test("staff cannot void a payment; owner can", async () => {
    const item = await createTestItem({ price: 50, stock: 10 });
    const customer = await createTestCustomer();
    await owner.json("/api/invoices", {
      method: "POST",
      body: JSON.stringify({ customerId: customer.id, lines: [{ itemId: item.id, qty: 1 }], settledTo: "ACCOUNT" }),
    });
    const { data: payment } = await owner.json("/api/payments", {
      method: "POST",
      body: JSON.stringify({ customerId: customer.id, amount: 50, method: "CARD" }),
    });

    const { res: staffRes } = await staff.json(`/api/payments/${payment.id}/void`, { method: "POST" });
    assert.equal(staffRes.status, 403);

    const { res: ownerRes } = await owner.json(`/api/payments/${payment.id}/void`, { method: "POST" });
    assert.equal(ownerRes.status, 200);
  });

  test("staff can mark a PO paid but not unmark it; owner can unmark", async () => {
    const item = await createTestItem({ cost: 10, stock: 0 });
    const vendor = await createTestVendor();
    const { data: po } = await owner.json("/api/purchase-orders", {
      method: "POST",
      body: JSON.stringify({ vendorId: vendor.id, lines: [{ itemId: item.id, qtyOrdered: 1, cost: 10, caseQty: 1 }] }),
    });

    const { res: markRes } = await staff.json(`/api/purchase-orders/${po.id}/toggle-paid`, {
      method: "POST",
      body: JSON.stringify({ method: "CARD" }),
    });
    assert.equal(markRes.status, 200, "staff should be able to mark a PO paid");

    const { res: unmarkStaffRes } = await staff.json(`/api/purchase-orders/${po.id}/toggle-paid`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    assert.equal(unmarkStaffRes.status, 403, "staff should not be able to unmark a PO as paid");

    const { res: unmarkOwnerRes } = await owner.json(`/api/purchase-orders/${po.id}/toggle-paid`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    assert.equal(unmarkOwnerRes.status, 200, "owner should be able to unmark a PO as paid");
  });

  test("staff cannot recalculate balances or create a new login; owner can", async () => {
    const { res: staffRecalc } = await staff.json("/api/admin/recalculate-balances", { method: "POST" });
    assert.equal(staffRecalc.status, 403);

    const { res: staffCreateUser } = await staff.json("/api/users", {
      method: "POST",
      body: JSON.stringify({ username: "_should_not_be_created", name: "x", tier: "STAFF", password: "password123" }),
    });
    assert.equal(staffCreateUser.status, 403);

    const { res: ownerRecalc } = await owner.json("/api/admin/recalculate-balances", { method: "POST" });
    assert.equal(ownerRecalc.status, 200);
  });

  test("the dashboard shows zero dollar figures to staff, but shows Total A/R as a dollar amount to owner", async () => {
    // React SSR inserts <!-- --> between adjacent text nodes (e.g. "$" and
    // "50.00" rendered as separate JSX expressions), so strip comments before
    // looking for an actual rendered currency amount.
    const stripComments = (html) => html.replace(/<!--.*?-->/g, "");

    const ownerHome = await owner.fetch("/");
    const ownerBody = stripComments(await ownerHome.text());
    assert.match(ownerBody, /Total A\/R/);
    assert.match(ownerBody, /\$\d+\.\d\d/, "owner should see at least one dollar figure (Total A/R)");

    const staffHome = await staff.fetch("/");
    const staffBody = stripComments(await staffHome.text());
    assert.match(staffBody, /Total A\/R/);
    assert.doesNotMatch(
      staffBody,
      /\$\d+\.\d\d/,
      "staff dashboard must have zero dollar figures, per the tier-visibility decision"
    );
  });
});
