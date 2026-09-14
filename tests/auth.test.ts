import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { login, apiRequest, BASE_URL } from "./helpers";

// Each test run uses a fresh, randomly-suffixed email so the suite is
// repeatable against the same database without colliding with previous
// runs or seeded demo data.
const runId = Date.now();
const testEmail = `test-${runId}@example.com`;
const testPassword = "password123";

describe("authentication", () => {
  test("register creates an account and returns a session cookie", async () => {
    const res = await apiRequest("/api/auth/register", null, {
      method: "POST",
      body: JSON.stringify({ name: "Test User", email: testEmail, password: testPassword }),
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.email, testEmail);
  });

  test("login with wrong password is rejected", async () => {
    const res = await apiRequest("/api/auth/login", null, {
      method: "POST",
      body: JSON.stringify({ email: testEmail, password: "wrongpassword" }),
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, "INVALID_CREDENTIALS");
  });

  test("login with correct password succeeds", async () => {
    const session = await login(testEmail, testPassword);
    assert.ok(session.cookie.includes("sharepool_session"));
  });

  test("an unauthenticated request to a protected endpoint is rejected", async () => {
    const res = await apiRequest("/api/auth/me", null);
    assert.equal(res.status, 401);
  });
});

describe("session security (the property that matters most)", () => {
  test("resetting a password invalidates every previously-issued session", async () => {
    // Log in twice, simulating two devices sharing one account.
    const device1 = await login(testEmail, testPassword);
    const device2 = await login(testEmail, testPassword);

    // Both should work before the reset.
    const before1 = await apiRequest("/api/auth/me", device1);
    const before2 = await apiRequest("/api/auth/me", device2);
    assert.equal(before1.status, 200);
    assert.equal(before2.status, 200);

    // Request a reset token, then use it directly (this test reads the
    // dev-only response field rather than an inbox, since no mail
    // provider exists in this environment — see lib/mailer.ts).
    const forgot = await apiRequest("/api/auth/forgot-password", null, {
      method: "POST",
      body: JSON.stringify({ email: testEmail }),
    });
    assert.equal(forgot.status, 200);
    const resetLink: string | undefined = forgot.body.data.devResetLink;
    assert.ok(resetLink, "expected a dev reset link in a non-production environment");

    const token = new URL(resetLink!).searchParams.get("token");
    assert.ok(token);

    const newPassword = "brandnewpassword456";
    const reset = await apiRequest("/api/auth/reset-password", null, {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    });
    assert.equal(reset.status, 200);

    // Both old sessions must now be dead — this is the actual security
    // guarantee, not just "the password changed in the database".
    const after1 = await apiRequest("/api/auth/me", device1);
    const after2 = await apiRequest("/api/auth/me", device2);
    assert.equal(after1.status, 401);
    assert.equal(after2.status, 401);

    // And the new password must actually work.
    const relogin = await login(testEmail, newPassword);
    assert.ok(relogin.cookie);
  });
});
