import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __sharepoolPool: Pool | undefined;
}

const pool =
  global.__sharepoolPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  global.__sharepoolPool = pool;
}

export const db = drizzle(pool, { schema });
export { pool };
