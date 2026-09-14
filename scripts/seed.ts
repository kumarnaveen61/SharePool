import "dotenv/config";
import { db, pool } from "../lib/db";
import { users, groups, groupMembers, memberships } from "../lib/db/schema";
import { hashPassword } from "../lib/auth/password";

const DEMO_NAMES = [
  "Naveen Kumar", "Arun Prasad", "Bala Subramanian", "Suresh Raina", "Kumar Vel",
  "Divya Sri", "Priya Sharma", "Ben Rodrigues", "Chitra Iyer", "Dev Patel",
  "Esha Nair", "Farah Khan", "Gowtham Raj", "Harini Menon", "Ilango Selvam",
  "Janani Ravi", "Karthik Balan", "Lakshmi Narayan", "Meena Rajan", "Nithya Sundar",
];

async function main() {
  console.log("Seeding demo data…");

  const demoPassword = await hashPassword("password123");

  // Platform-level SUPER_ADMIN account, separate from group-level roles.
  const [superAdmin] = await db
    .insert(users)
    .values({
      name: "Platform Admin",
      email: "admin@demo.sharepool.app",
      passwordHash: demoPassword,
      role: "SUPER_ADMIN",
      emailVerified: true,
      isDemo: true,
    })
    .returning();

  const demoUsers = await db
    .insert(users)
    .values(
      DEMO_NAMES.map((name, i) => ({
        name,
        email: `${name.toLowerCase().replace(/\s+/g, ".")}@demo.sharepool.app`,
        passwordHash: demoPassword,
        emailVerified: i % 3 !== 0, // mix of verified/unverified for realism
        isDemo: true,
      }))
    )
    .returning();

  const [naveen, arun, bala, suresh, kumar, divya, priya, ben, chitra, dev, esha] = demoUsers;

  const [group] = await db
    .insert(groups)
    .values({
      name: "Chennai Friends Pool",
      description: "Our circle sharing subscriptions and benefits responsibly.",
      ownerId: naveen.id,
      inviteCode: "DEMO2026",
      memberLimit: 25,
      rules: "Please return access windows on time. Be kind. No sharing outside this group.",
      isDemo: true,
    })
    .returning();

  await db.insert(groupMembers).values([
    { groupId: group.id, userId: naveen.id, role: "OWNER" },
    { groupId: group.id, userId: arun.id, role: "ADMIN" },
    ...demoUsers.slice(2).map((u) => ({
      groupId: group.id,
      userId: u.id,
      role: "MEMBER" as const,
    })),
  ]);

  await db.insert(memberships).values([
    {
      groupId: group.id, ownerId: naveen.id, name: "Netflix", category: "OTT",
      provider: "Netflix", planName: "Premium (4K, 4 screens)",
      description: "Officially supports 4 simultaneous screens.",
      sharingEligibility: "OFFICIALLY_SHAREABLE", status: "AVAILABLE",
      maxSimultaneousUsers: 4, isDemo: true,
    },
    {
      groupId: group.id, ownerId: arun.id, name: "Spotify", category: "MUSIC",
      provider: "Spotify", planName: "Family Plan",
      description: "Family plan has room for 2 more.",
      sharingEligibility: "OFFICIALLY_SHAREABLE", status: "AVAILABLE",
      maxSimultaneousUsers: 6, isDemo: true,
    },
    {
      groupId: group.id, ownerId: bala.id, name: "Amazon Prime", category: "SHOPPING",
      provider: "Amazon", planName: "Prime Household",
      description: "Fast delivery + Prime Video via Amazon Household.",
      sharingEligibility: "OFFICIALLY_SHAREABLE", status: "AVAILABLE",
      maxSimultaneousUsers: 2, isDemo: true,
    },
    {
      groupId: group.id, ownerId: suresh.id, name: "MedPlus", category: "PHARMACY",
      provider: "MedPlus", description: "I can pick up medicines for anyone on my runs.",
      sharingEligibility: "OWNER_ASSISTED", status: "UNAVAILABLE", isDemo: true,
    },
    {
      groupId: group.id, ownerId: kumar.id, name: "Airport Lounge Access", category: "AIRPORT_LOUNGE",
      provider: "Credit card benefit", description: "2 complimentary guest passes per quarter.",
      sharingEligibility: "TRANSFERABLE_BENEFIT", status: "AVAILABLE",
      totalUnits: 2, remainingUnits: 2, isDemo: true,
    },
    {
      groupId: group.id, ownerId: divya.id, name: "JioHotstar", category: "OTT",
      provider: "JioHotstar", planName: "Super",
      description: "Official multi-device plan.",
      sharingEligibility: "OFFICIALLY_SHAREABLE", status: "AVAILABLE",
      maxSimultaneousUsers: 2, isDemo: true,
    },
    {
      groupId: group.id, ownerId: priya.id, name: "YouTube Premium", category: "OTT",
      provider: "YouTube", planName: "Family",
      description: "Family plan, room for one more.",
      sharingEligibility: "OFFICIALLY_SHAREABLE", status: "AVAILABLE",
      maxSimultaneousUsers: 6, isDemo: true,
    },
    {
      groupId: group.id, ownerId: ben.id, name: "Swiggy One", category: "FOOD_DELIVERY",
      provider: "Swiggy", description: "I'll place the order for you, just share the list.",
      sharingEligibility: "OWNER_ASSISTED", status: "AVAILABLE", isDemo: true,
    },
    {
      groupId: group.id, ownerId: chitra.id, name: "Zomato Gold", category: "FOOD_DELIVERY",
      provider: "Zomato", description: "Order placed on my account, I'll handle it.",
      sharingEligibility: "OWNER_ASSISTED", status: "UNAVAILABLE", isDemo: true,
    },
    {
      groupId: group.id, ownerId: dev.id, name: "Movie Benefit Voucher", category: "MOVIES",
      provider: "Credit card benefit", description: "One free movie ticket per month via my card.",
      sharingEligibility: "TRANSFERABLE_BENEFIT", status: "AVAILABLE",
      totalUnits: 1, remainingUnits: 1, isDemo: true,
    },
    {
      groupId: group.id, ownerId: esha.id, name: "Canva Pro", category: "SOFTWARE",
      provider: "Canva", planName: "Pro Team",
      description: "Team plan has spare seats.",
      sharingEligibility: "OFFICIALLY_SHAREABLE", status: "AVAILABLE",
      maxSimultaneousUsers: 5, isDemo: true,
    },
    {
      groupId: group.id, ownerId: naveen.id, name: "Microsoft 365", category: "SOFTWARE",
      provider: "Microsoft", planName: "Family",
      description: "6-person family plan.",
      sharingEligibility: "OFFICIALLY_SHAREABLE", status: "AVAILABLE",
      maxSimultaneousUsers: 6, isDemo: true,
    },
    {
      groupId: group.id, ownerId: arun.id, name: "Gold's Gym Guest Pass", category: "FITNESS",
      provider: "Gold's Gym", description: "One guest pass per month.",
      sharingEligibility: "TRANSFERABLE_BENEFIT", status: "AVAILABLE",
      totalUnits: 1, remainingUnits: 1, isDemo: true,
    },
    {
      groupId: group.id, ownerId: bala.id, name: "Taj Hotels Membership Discount", category: "HOTEL",
      provider: "Taj Hotels", description: "I can book on your behalf using my discount.",
      sharingEligibility: "OWNER_ASSISTED", status: "UNAVAILABLE", isDemo: true,
    },
    {
      groupId: group.id, ownerId: kumar.id, name: "Personal Health Insurance Portal", category: "HEALTHCARE",
      description: "Tracked for reference only — this is personal and cannot be shared.",
      sharingEligibility: "NOT_SHAREABLE", status: "UNAVAILABLE", isDemo: true,
    },
  ]);

  console.log("Seed complete.");
  console.log(`Created ${demoUsers.length + 1} users (1 platform admin + ${demoUsers.length} members), 1 group, 15 memberships.`);
  console.log("Demo logins (all password: password123):");
  console.log("  Platform admin: admin@demo.sharepool.app");
  console.log("  Group owner:    naveen.kumar@demo.sharepool.app");
  console.log("  Group admin:    arun.prasad@demo.sharepool.app");
  console.log("Demo invite code: DEMO2026");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
