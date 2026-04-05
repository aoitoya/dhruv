import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		env: {
			DATABASE_URL: "postgresql://test:test@localhost:5432/test",
			CLIENT_ORIGIN: "http://localhost:5173",
			BETTER_AUTH_URL: "http://localhost:3000",
			BETTER_AUTH_SECRET: "adfadsfjaoidsfjoadjf",
			GITHUB_CLIENT_ID: "asdfdsafadsfads",
			GITHUB_CLIENT_SECRET: "fdadfasdfasdf",
		},
	},
});
