import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";
import { config } from "../config/index.js";

/**
 * Registers the `@fastify/cors` plugin on the provided Fastify instance using CORS settings from `config.cors`.
 *
 * The plugin is configured with `origin`, `methods`, `allowedHeaders`, `credentials`, and `maxAge` taken from the application's configuration.
 */
export function registerCors(app: FastifyInstance) {
	app.register(cors, {
		origin: config.cors.origins,
		methods: config.cors.methods,
		allowedHeaders: config.cors.allowedHeaders,
		credentials: config.cors.credentials,
		maxAge: config.cors.maxAge,
	});
}
