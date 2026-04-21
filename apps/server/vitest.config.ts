import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		env: {
			DATABASE_URL: "postgresql://test:test@localhost:5432/test",
			REDIS_URL: "redis://localhost:6379",
			CLIENT_ORIGIN: "http://localhost:5173",
			BETTER_AUTH_URL: "http://localhost:3000",
			BETTER_AUTH_SECRET: "adfadsfjaoidsfjoadjf",
			GITHUB_CLIENT_ID: "asdfdsafadsfads",
			GITHUB_CLIENT_SECRET: "fdadfasdfasdf",
			GOOGLE_CLIENT_ID: "test-google-client-id",
			GOOGLE_CLIENT_SECRET: "test-google-client-secret",
			RESEND_API_KEY: "test-resend-api-key",
			FRONTEND_URL: "http://localhost:5173",
		},
		coverage: {
			provider: "v8",
			include: ["src/**/*.ts"],
			exclude: ["src/**/*.test.ts"],
		},
		testTimeout: 30000,
	},
});
