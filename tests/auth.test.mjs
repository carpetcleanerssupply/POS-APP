import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { BASE_URL, makeSession, loginAs, ensureTestUsers } from "./helpers.mjs";

describe("auth", () => {
  test("unauthenticated request to home page redirects to /login", async () => {
    const res = await fetch(`${BASE_URL}/`, { redirect: "manual" });
    assert.equal(res.status, 307);
    assert.match(res.headers.get("location"), /\/login$/);
  });

  test("wrong password is rejected", async () => {
    await ensureTestUsers();
    const session = makeSession();
    const res = await session.form("/api/auth/login", { username: "_test_owner", password: "not-the-password" });
    assert.equal(res.status, 303);
    assert.match(res.headers.get("location"), /error=invalid/);
  });

  test("correct password logs in and unlocks the home page", async () => {
    await ensureTestUsers();
    const session = await loginAs("_test_owner", "test-owner-pw-123");
    const res = await session.fetch("/");
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.match(body, /_Test Owner/);
  });

  test("logout locks the home page again", async () => {
    await ensureTestUsers();
    const session = await loginAs("_test_owner", "test-owner-pw-123");
    await session.fetch("/api/auth/logout", { method: "POST" });
    const res = await session.fetch("/");
    assert.equal(res.status, 307);
  });
});
