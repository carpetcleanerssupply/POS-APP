import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma, loginAs, ensureTestUsers, createTestItem, createTestVendor, cleanupAllTestData } from "./helpers.mjs";

describe("vendors", () => {
  let session;

  before(async () => {
    await ensureTestUsers();
    session = await loginAs("_test_owner", "test-owner-pw-123");
  });

  after(async () => {
    await cleanupAllTestData();
  });

  test("a vendor referenced by an item or a PO can't be deleted", async () => {
    const vendor = await createTestVendor();
    const item = await createTestItem({ vendorName: vendor.name });

    const byItemRes = await session.form(`/api/vendors/${vendor.id}/delete`, {});
    assert.equal(byItemRes.status, 303);
    assert.match(byItemRes.headers.get("location"), /error=in_use/);

    const stillThere = await prisma.vendor.findUnique({ where: { id: vendor.id } });
    assert.ok(stillThere, "vendor referenced by an item must not be deleted");

    await prisma.item.update({ where: { id: item.id }, data: { vendorName: null } });

    const vendor2 = await createTestVendor();
    const item2 = await createTestItem();
    await session.json("/api/purchase-orders", {
      method: "POST",
      body: JSON.stringify({ vendorId: vendor2.id, lines: [{ itemId: item2.id, qtyOrdered: 1, cost: 1, caseQty: 1 }] }),
    });
    const byPoRes = await session.form(`/api/vendors/${vendor2.id}/delete`, {});
    assert.match(byPoRes.headers.get("location"), /error=in_use/);
  });

  test("a vendor with no references can be deleted", async () => {
    const vendor = await createTestVendor();
    const res = await session.form(`/api/vendors/${vendor.id}/delete`, {});
    assert.equal(res.status, 303);
    assert.doesNotMatch(res.headers.get("location"), /error=/);

    const gone = await prisma.vendor.findUnique({ where: { id: vendor.id } });
    assert.equal(gone, null);
  });

  test("a duplicate vendor name is rejected", async () => {
    const vendor = await createTestVendor();
    const res = await session.form("/api/vendors", { name: vendor.name });
    assert.equal(res.status, 303);
    assert.match(res.headers.get("location"), /error=duplicate_name/);
  });
});
