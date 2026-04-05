import { beforeAll, expect, test } from "vitest";
import { buildApp } from "../src/app";

const app = buildApp();

test("App runs", async () => {
	beforeAll(async () => {
		await app.ready();
	});

	const response = await app.inject({
		method: "GET",
		url: "/",
	});

	expect(response.statusCode).toBe(200);
});
