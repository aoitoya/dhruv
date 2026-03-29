import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { config } from "@/config/index.js";
import * as schema from "@/db/schema/index.js";

const sql = neon(config.db.databaseUrl);
export const db = drizzle(sql, { schema });
