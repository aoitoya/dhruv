import Fastify from "fastify";
import { authRoutes } from "@/modules/auth/index.js";
import { registerCors } from "@/plugins/cors.js";

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
