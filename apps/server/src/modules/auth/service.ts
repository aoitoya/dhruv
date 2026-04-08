import { redisStorage } from "@better-auth/redis-storage";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { Redis } from "ioredis";
import { config } from "../../config/index.js";
import { db } from "../../db/index.js";
import * as schema from "../../db/schema/index.js";

const redis = new Redis(config.redis.url);

export const auth = betterAuth({
	appName: "Dhruv",
	database: drizzleAdapter(db, {
		provider: "pg",
		schema,
	}),
	secondaryStorage: redisStorage({
		client: redis,
	}),
	session: {
		expiresIn: 60 * 60 * 24 * 7,
		updateAge: 60 * 60 * 24,
		cookieCache: {
			enabled: true,
			maxAge: 60 * 5,
		},
	},
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
