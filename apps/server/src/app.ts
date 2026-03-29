import Fastify from "fastify";
import { authRoutes } from "@/modules/auth/index.js";
import { registerCors } from "@/plugins/cors.js";

/**
 * Create and configure a Fastify application instance.
 *
 * Registers CORS and authentication routes, enables request logging, and mounts a GET / route that returns `{ hello: "world" }`.
 *
 * @returns The configured Fastify instance
 */
export async function buildApp() {
	const app = Fastify({
		logger: true,
	});

	await registerCors(app);
	await authRoutes(app);

	app.get("/", async () => {
		return { hello: "world" };
	});

	return app;
}
