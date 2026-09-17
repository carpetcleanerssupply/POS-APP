# Integration tests

Run with `npm test`. These are real integration tests, not mocks — they hit
the actual dev server over HTTP and the actual database, the same way this
project's manual QA has been done throughout development.

**Prerequisites:**
- The dev server must be running (`npm run dev`) on `http://localhost:3000`
  (override with `TEST_BASE_URL`).
- Point `.env` at a database you're okay writing test data to — **never run
  this against a production database.**

**Test data:** every record these tests create is prefixed (`_TEST-...` for
item SKUs, `_Test Customer ...` / `_Test Vendor ...` for names) and cleaned
up in each suite's `after()` hook. Two persistent login fixtures,
`_test_owner` and `_test_staff`, are created once and reused across runs
(via `ensureTestUsers()`) rather than deleted each time — they're harmless,
clearly named, and never touch real user accounts.

Test files run serially (`--test-concurrency=1`, set in the `test` script).
Node's test runner parallelizes across files by default, which caused
cross-file races against the shared database in early development of this
suite (one file's cleanup deleting rows another file's still-running test
depended on) — keep this flag if you ever restructure the scripts.
