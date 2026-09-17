import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  prisma,
  loginAs,
  ensureTestUsers,
  createTestItem,
  createTestVendor,
  cleanupAllTestData,
} from "./helpers.mjs";

describe("purchase orders", () => {
  let session;

  before(async () => {
    await ensureTestUsers();
    session = await loginAs("_test_owner", "test-owner-pw-123");
  });

  after(async () => {
    await cleanupAllTestData();
  });

  test("a draft PO never touches stock, and marking it ordered requires at least one line", async () => {
    const vendor = await createTestVendor();

    const { res: emptyRes, data: emptyPo } = await session.json("/api/purchase-orders", {
      method: "POST",
      body: JSON.stringify({ vendorId: vendor.id, lines: [] }),
    });
    assert.equal(emptyRes.status, 201, "an empty draft PO is allowed to exist");

    const { res: markRes, data: markData } = await session.json(`/api/purchase-orders/${emptyPo.id}/mark-ordered`, {
      method: "POST",
    });
    assert.equal(markRes.status, 400);
    assert.match(markData.error, /at least one item/);
  });

  test("receiving increments stock by qty * caseQty and derives PARTIAL vs RECEIVED correctly", async () => {
    const item = await createTestItem({ stock: 0, caseQty: 6 });
    const vendor = await createTestVendor();

    const { data: po } = await session.json("/api/purchase-orders", {
      method: "POST",
      body: JSON.stringify({ vendorId: vendor.id, lines: [{ itemId: item.id, qtyOrdered: 10, cost: 5, caseQty: 6 }] }),
    });
    await session.json(`/api/purchase-orders/${po.id}/mark-ordered`, { method: "POST" });

    const line = await prisma.purchaseOrderLine.findFirst({ where: { poId: po.id } });

    const { res: partialRes } = await session.json(`/api/purchase-orders/${po.id}/receive`, {
      method: "POST",
      body: JSON.stringify({ receipts: [{ lineId: line.id, qty: 4 }] }),
    });
    assert.equal(partialRes.status, 200);

    let itemRow = await prisma.item.findUnique({ where: { id: item.id } });
    assert.equal(itemRow.stock, 24, "4 cases * 6 per case");
    let poRow = await prisma.purchaseOrder.findUnique({ where: { id: po.id } });
    assert.equal(poRow.status, "PARTIAL");

    const { res: finalRes } = await session.json(`/api/purchase-orders/${po.id}/receive`, {
      method: "POST",
      body: JSON.stringify({ receipts: [{ lineId: line.id, qty: 6 }] }),
    });
    assert.equal(finalRes.status, 200);

    itemRow = await prisma.item.findUnique({ where: { id: item.id } });
    assert.equal(itemRow.stock, 60, "10 cases * 6 per case total");
    poRow = await prisma.purchaseOrder.findUnique({ where: { id: po.id } });
    assert.equal(poRow.status, "RECEIVED");
  });

  test("a PO's lines lock the moment any quantity has been received", async () => {
    const item = await createTestItem({ stock: 0 });
    const vendor = await createTestVendor();
    const { data: po } = await session.json("/api/purchase-orders", {
      method: "POST",
      body: JSON.stringify({ vendorId: vendor.id, lines: [{ itemId: item.id, qtyOrdered: 5, cost: 5, caseQty: 1 }] }),
    });
    await session.json(`/api/purchase-orders/${po.id}/mark-ordered`, { method: "POST" });
    const line = await prisma.purchaseOrderLine.findFirst({ where: { poId: po.id } });
    await session.json(`/api/purchase-orders/${po.id}/receive`, {
      method: "POST",
      body: JSON.stringify({ receipts: [{ lineId: line.id, qty: 1 }] }),
    });

    const { res, data } = await session.json(`/api/purchase-orders/${po.id}`, {
      method: "POST",
      body: JSON.stringify({ vendorId: vendor.id, lines: [{ itemId: item.id, qtyOrdered: 99, cost: 5, caseQty: 1 }] }),
    });
    assert.equal(res.status, 400);
    assert.match(data.error, /receiving has already started/);
  });

  test("only a draft PO can be deleted", async () => {
    const item = await createTestItem({ stock: 0 });
    const vendor = await createTestVendor();
    const { data: po } = await session.json("/api/purchase-orders", {
      method: "POST",
      body: JSON.stringify({ vendorId: vendor.id, lines: [{ itemId: item.id, qtyOrdered: 1, cost: 5, caseQty: 1 }] }),
    });
    await session.json(`/api/purchase-orders/${po.id}/mark-ordered`, { method: "POST" });

    const { res, data } = await session.json(`/api/purchase-orders/${po.id}/delete`, { method: "POST" });
    assert.equal(res.status, 400);
    assert.match(data.error, /draft/);
  });
});
