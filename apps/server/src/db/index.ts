import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { config } from "../config/index.js";

const pool = new Pool({
	connectionString: config.db.databaseUrl,
});
export const db = drizzle(pool);
