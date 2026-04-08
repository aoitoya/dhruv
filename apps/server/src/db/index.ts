import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { config } from "../config/index.js";

const pool = new Pool({
	connectionString: config.db.databaseUrl,
});
export const db = drizzle(pool);

export async function checkDbConnection() {
	try {
		await db.execute(sql`SELECT 1`);
		console.log("Database connected successfully");
	} catch (error) {
		console.error("Failed to connect to database", error);
		process.exit(1);
	}
}
