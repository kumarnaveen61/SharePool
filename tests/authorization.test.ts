import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { login, apiRequest } from "./helpers";

const runId = Date.now();

async function registerAndLogin(label: string) {
  const email = `${label}-${runId}@example.com`;
  const password = "password123";
  await apiRequest("/api/auth/register", null, {
    method: "POST",
    body: JSON.stringify({ name: label, email, password }),
  });
  return login(email, password);
}

describe("authorization boundaries", () => {
  test("a user cannot read another group's memberships by guessing its groupId", async () => {
    const owner = await registerAndLogin("owner");
    const outsider = await registerAndLogin("outsider");

    const createGroup = await apiRequest("/api/groups", owner, {
      method: "POST",
      body: JSON.stringify({ name: "Private Test Group" }),
    });
    assert.equal(createGroup.status, 201);
    const groupId = createGroup.body.data.group.id;

    // The owner can read it.
    const ownerRead = await apiRequest(`/api/memberships?groupId=${groupId}`, owner);
    assert.equal(ownerRead.status, 200);

    // A user who was never invited cannot, even knowing the exact groupId.
    const outsiderRead = await apiRequest(`/api/memberships?groupId=${groupId}`, outsider);
    assert.equal(outsiderRead.status, 403);
  });

  test("a membership marked NOT_SHAREABLE can never be made available, even by its owner", async () => {
    const owner = await registerAndLogin("notshareable-owner");

    const createGroup = await apiRequest("/api/groups", owner, {
      method: "POST",
      body: JSON.stringify({ name: "Compliance Test Group" }),
    });
    const groupId = createGroup.body.data.group.id;

    const createMembership = await apiRequest("/api/memberships", owner, {
      method: "POST",
      body: JSON.stringify({
        groupId,
        name: "Personal Medical Portal",
        category: "HEALTHCARE",
        sharingEligibility: "NOT_SHAREABLE",
      }),
    });
    assert.equal(createMembership.status, 201);
    const membershipId = createMembership.body.data.membership.id;

    const attempt = await apiRequest(
      `/api/memberships/${membershipId}/availability`,
      owner,
      {
        method: "POST",
        body: JSON.stringify({
          startTime: new Date(Date.now() + 3600_000).toISOString(),
          endTime: new Date(Date.now() + 7200_000).toISOString(),
        }),
      }
    );
    assert.equal(attempt.status, 422);
    assert.equal(attempt.body.error.code, "NOT_SHAREABLE");
  });

  test("blocking a user hides their memberships and blocks new requests between both parties", async () => {
    const owner = await registerAndLogin("block-owner");
    const blocker = await registerAndLogin("block-blocker");

    const createGroup = await apiRequest("/api/groups", owner, {
      method: "POST",
      body: JSON.stringify({ name: "Blocking Test Group" }),
    });
    const groupId = createGroup.body.data.group.id;

    const inviteCode = createGroup.body.data.group.inviteCode;
    const join = await apiRequest("/api/groups/join", blocker, {
      method: "POST",
      body: JSON.stringify({ inviteCode }),
    });
    assert.equal(join.status, 201);

    const createMembership = await apiRequest("/api/memberships", owner, {
      method: "POST",
      body: JSON.stringify({
        groupId,
        name: "Blockable Membership",
        category: "OTT",
        sharingEligibility: "OFFICIALLY_SHAREABLE",
      }),
    });
    const membershipId = createMembership.body.data.membership.id;

    await apiRequest(`/api/memberships/${membershipId}/availability`, owner, {
      method: "POST",
      body: JSON.stringify({
        startTime: new Date(Date.now() + 3600_000).toISOString(),
        endTime: new Date(Date.now() + 7200_000).toISOString(),
      }),
    });

    // Get the owner's user id from the membership list to block them.
    const beforeBlockList = await apiRequest(`/api/memberships?groupId=${groupId}`, blocker);
    assert.equal(beforeBlockList.body.data.memberships.length, 1);
    const ownerId = beforeBlockList.body.data.memberships[0].ownerId;

    const block = await apiRequest(`/api/groups/${groupId}/blocks`, blocker, {
      method: "POST",
      body: JSON.stringify({ userId: ownerId }),
    });
    assert.equal(block.status, 201);

    // The membership must now be filtered out of the list...
    const afterBlockList = await apiRequest(`/api/memberships?groupId=${groupId}`, blocker);
    assert.equal(afterBlockList.body.data.memberships.length, 0);

    // ...and a direct request by ID (bypassing the filtered list) must
    // also be rejected, not just hidden from view.
    const directRequest = await apiRequest("/api/access-requests", blocker, {
      method: "POST",
      body: JSON.stringify({
        membershipId,
        requestedStartTime: new Date(Date.now() + 3600_000).toISOString(),
        requestedEndTime: new Date(Date.now() + 7200_000).toISOString(),
      }),
    });
    assert.equal(directRequest.status, 403);
    assert.equal(directRequest.body.error.code, "BLOCKED");
  });
});
