import { createRequire } from "node:module";
import type { FastifyInstance } from "fastify";
import { config } from "@/config/index.js";

const require = createRequire(import.meta.url);

export async function registerCors(app: FastifyInstance): Promise<void> {
	const fastifyCors = require("@fastify/cors");
	app.register(fastifyCors, {
		origin: config.cors.origins,
		methods: config.cors.methods,
		allowedHeaders: config.cors.allowedHeaders,
		credentials: config.cors.credentials,
		maxAge: config.cors.maxAge,
	});
}
