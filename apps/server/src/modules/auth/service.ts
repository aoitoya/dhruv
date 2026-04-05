import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { config } from "../../config/index.js";
import { db } from "../../db/index.js";
import * as schema from "../../db/schema/index.js";

export const auth = betterAuth({
 appName: "Dhruv",
 database: drizzleAdapter(db, {
		provider: "pg",
		schema,
	}),
	emailAndPassword: {
		enabled: true,
	},
	socialProviders: {
		github: {
			clientId: config.auth.github.clientId,
			clientSecret: config.auth.github.clientSecret,
		},
	},
	cors: {
		origin: config.cors.origins,
		credentials: config.cors.credentials,
	},
	trustedOrigins: config.cors.origins,
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
