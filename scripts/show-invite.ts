import "dotenv/config";
import { db } from "../lib/db";
import { groups } from "../lib/db/schema";

async function main() {
  const all = await db
    .select({ name: groups.name, inviteCode: groups.inviteCode, id: groups.id })
    .from(groups);
  console.log(JSON.stringify(all, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});