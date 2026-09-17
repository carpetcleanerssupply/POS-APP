// Integration test helpers — these hit the real dev server (must be running
// on BASE_URL) and the real database, the same way this project's manual QA
// has been done throughout development. Each test suite seeds and cleans up
// its own data with unique identifiers so parallel/repeated runs don't collide.
import { PrismaClient } from "@prisma/client";

export const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
export const prisma = new PrismaClient();

export function uniqueSuffix() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

// A tiny cookie jar — enough for these single-user test flows.
export function makeSession() {
  let cookie = null;
  return {
    async fetch(path, options = {}) {
      const headers = { ...(options.headers || {}) };
      if (cookie) headers["Cookie"] = cookie;
      const res = await fetch(`${BASE_URL}${path}`, { ...options, headers, redirect: "manual" });
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) cookie = setCookie.split(";")[0];
      return res;
    },
    async json(path, options = {}) {
      const res = await this.fetch(path, {
        ...options,
        headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      });
      const data = await res.json().catch(() => ({}));
      return { res, data };
    },
    async form(path, formBody, options = {}) {
      return this.fetch(path, {
        ...options,
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", ...(options.headers || {}) },
        body: new URLSearchParams(formBody).toString(),
      });
    },
  };
}

export async function loginAs(username, password) {
  const session = makeSession();
  const res = await session.form("/api/auth/login", { username, password });
  if (res.status !== 303) throw new Error(`Login failed for ${username}: ${res.status}`);
  return session;
}

// Ensures a known Owner/Manager and Staff login exist for tests, without
// disturbing any real users already in the database.
export async function ensureTestUsers() {
  const bcrypt = (await import("bcryptjs")).default;
  const ownerHash = await bcrypt.hash("test-owner-pw-123", 12);
  const staffHash = await bcrypt.hash("test-staff-pw-123", 12);

  await prisma.user.upsert({
    where: { username: "_test_owner" },
    update: { passwordHash: ownerHash, active: true, tier: "OWNER_MANAGER" },
    create: { username: "_test_owner", name: "_Test Owner", tier: "OWNER_MANAGER", passwordHash: ownerHash },
  });
  await prisma.user.upsert({
    where: { username: "_test_staff" },
    update: { passwordHash: staffHash, active: true, tier: "STAFF" },
    create: { username: "_test_staff", name: "_Test Staff", tier: "STAFF", passwordHash: staffHash },
  });
}

export async function createTestItem(overrides = {}) {
  const sku = `_TEST-${uniqueSuffix()}`;
  return prisma.item.create({
    data: {
      sku,
      name: `Test Item ${sku}`,
      cost: 10,
      price: 20,
      stock: 10,
      caseQty: 1,
      ...overrides,
    },
  });
}

export async function createTestCustomer(overrides = {}) {
  return prisma.customer.create({
    data: {
      company: `_Test Customer ${uniqueSuffix()}`,
      ...overrides,
    },
  });
}

export async function createTestVendor(overrides = {}) {
  return prisma.vendor.create({
    data: {
      name: `_Test Vendor ${uniqueSuffix()}`,
      ...overrides,
    },
  });
}

// Deletes everything this test run's helpers could have created, scoped to
// the "_TEST-"/"_Test " naming convention above plus the two shared test
// logins — never touches real data.
export async function cleanupAllTestData() {
  const testCustomers = await prisma.customer.findMany({ where: { company: { startsWith: "_Test Customer" } } });
  const testCustomerIds = testCustomers.map((c) => c.id);
  const testItems = await prisma.item.findMany({ where: { sku: { startsWith: "_TEST-" } } });
  const testItemIds = testItems.map((i) => i.id);

  await prisma.paymentApplication.deleteMany({ where: { payment: { customerId: { in: testCustomerIds } } } });
  await prisma.payment.deleteMany({ where: { customerId: { in: testCustomerIds } } });
  await prisma.returnLine.deleteMany({ where: { return: { customerId: { in: testCustomerIds } } } });
  await prisma.return.deleteMany({ where: { customerId: { in: testCustomerIds } } });
  await prisma.estimateLine.deleteMany({ where: { estimate: { customerId: { in: testCustomerIds } } } });
  await prisma.estimate.deleteMany({ where: { customerId: { in: testCustomerIds } } });
  await prisma.invoiceLine.deleteMany({ where: { invoice: { customerId: { in: testCustomerIds } } } });
  await prisma.invoice.deleteMany({ where: { customerId: { in: testCustomerIds } } });
  await prisma.purchaseOrderLine.deleteMany({ where: { itemId: { in: testItemIds } } });
  await prisma.purchaseOrder.deleteMany({ where: { vendorName: { startsWith: "_Test Vendor" } } });
  await prisma.customer.deleteMany({ where: { id: { in: testCustomerIds } } });
  await prisma.item.deleteMany({ where: { id: { in: testItemIds } } });
  await prisma.vendor.deleteMany({ where: { name: { startsWith: "_Test Vendor" } } });
  await prisma.activityLog.deleteMany({ where: { userId: { in: await testUserIds() } } });
}

async function testUserIds() {
  const users = await prisma.user.findMany({ where: { username: { in: ["_test_owner", "_test_staff"] } } });
  return users.map((u) => u.id);
}
