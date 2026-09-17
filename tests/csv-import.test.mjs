import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma, loginAs, ensureTestUsers, cleanupAllTestData, uniqueSuffix } from "./helpers.mjs";

function csvFile(text, name) {
  return new File([text], name, { type: "text/csv" });
}

describe("csv import/export", () => {
  let session;

  before(async () => {
    await ensureTestUsers();
    session = await loginAs("_test_owner", "test-owner-pw-123");
  });

  after(async () => {
    await cleanupAllTestData();
  });

  test("item import creates a new SKU and updates an existing one", async () => {
    const sku = `_TEST-${uniqueSuffix()}`;
    const csv =
      "SKU,Item Name,Category,Vendor,Cost,Price,Stock Qty,Unit,Units/Case,COGS Acct,Income Account\n" +
      `${sku},Original Name,Tools,,10,20,5,ea,1,Cost of Goods Sold,Uncategorized\n`;

    const form1 = new FormData();
    form1.append("file", csvFile(csv, "items.csv"));
    const res1 = await session.fetch("/api/items/import", { method: "POST", body: form1 });
    const data1 = await res1.json();
    assert.equal(res1.status, 200);
    assert.equal(data1.created, 1);
    assert.equal(data1.updated, 0);

    const updateCsv =
      "SKU,Item Name,Category,Vendor,Cost,Price,Stock Qty,Unit,Units/Case,COGS Acct,Income Account\n" +
      `${sku},Renamed,Tools,,10,25,9,ea,1,Cost of Goods Sold,Uncategorized\n`;
    const form2 = new FormData();
    form2.append("file", csvFile(updateCsv, "items.csv"));
    const res2 = await session.fetch("/api/items/import", { method: "POST", body: form2 });
    const data2 = await res2.json();
    assert.equal(data2.created, 0);
    assert.equal(data2.updated, 1);

    const item = await prisma.item.findUnique({ where: { sku } });
    assert.equal(item.name, "Renamed");
    assert.equal(Number(item.price), 25);
    assert.equal(item.stock, 9);
  });

  test("item import rejects a CSV missing required columns", async () => {
    const form = new FormData();
    form.append("file", csvFile("Name,Foo\nTest,Bar\n", "bad.csv"));
    const res = await session.fetch("/api/items/import", { method: "POST", body: form });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /Missing required column/);
  });

  test("customer import always creates, and never imports the Balance column", async () => {
    const name = `_Test Customer ${uniqueSuffix()}`;
    const csv =
      "Company,First Name,Last Name,Work Phone,Cell Phone,Email,Secondary Email,Unsubscribed,Billing Street,Billing Street 2,Billing City,Billing State,Billing ZIP,Ship Same As Billing,Shipping Street,Shipping Street 2,Shipping City,Shipping State,Shipping ZIP,Tax-Exempt,Resale Cert #,\"Balance (reference only, not imported)\"\n" +
      `${name},,,555-1000,,a@example.com,,No,1 Main St,,Portland,OR,97201,Yes,,,,,,No,,9999.99\n`;

    const form = new FormData();
    form.append("file", csvFile(csv, "customers.csv"));
    const res = await session.fetch("/api/customers/import", { method: "POST", body: form });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.created, 1);

    const customer = await prisma.customer.findFirst({ where: { company: name } });
    assert.equal(customer.billingCity, "Portland");
    assert.equal(customer.shippingCity, "Portland", "shipSameAsBilling should copy the billing city");
    assert.equal(Number(customer.balance), 0, "the Balance column must never be imported");
  });

  test("vendor import creates a new vendor and updates an existing one by name", async () => {
    const name = `_Test Vendor ${uniqueSuffix()}`;
    const csv =
      "Vendor Name,Contact Name,Phone,Email,Email 2,Street,Street 2,City,State,Zip,Notes\n" +
      `${name},Original Contact,555-1000,,,,,,,,\n`;
    const form1 = new FormData();
    form1.append("file", csvFile(csv, "vendors.csv"));
    const res1 = await session.fetch("/api/vendors/import", { method: "POST", body: form1 });
    const data1 = await res1.json();
    assert.equal(data1.created, 1);

    const updateCsv =
      "Vendor Name,Contact Name,Phone,Email,Email 2,Street,Street 2,City,State,Zip,Notes\n" +
      `${name},Updated Contact,555-2000,,,,,,,,\n`;
    const form2 = new FormData();
    form2.append("file", csvFile(updateCsv, "vendors.csv"));
    const res2 = await session.fetch("/api/vendors/import", { method: "POST", body: form2 });
    const data2 = await res2.json();
    assert.equal(data2.updated, 1);

    const vendor = await prisma.vendor.findUnique({ where: { name } });
    assert.equal(vendor.contactName, "Updated Contact");
    assert.equal(vendor.phone, "555-2000");
  });
});
