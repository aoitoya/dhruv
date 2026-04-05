import sensible from "@fastify/sensible";
import type {
	FastifyPluginAsyncJsonSchemaToTs,
	JsonSchemaToTsProvider,
} from "@fastify/type-provider-json-schema-to-ts";
import Fastify from "fastify";
import { registerAuthRoutes } from "./modules/auth/index.js";
import { registerWorkspaceRoutes } from "./modules/workspace/index.js";
import { registerCors } from "./plugins/cors.js";

/**
 * Create and configure a Fastify application instance.
 *
 * Registers CORS and authentication routes, enables request logging, and mounts a GET / route that returns `{ hello: "world" }`.
 *
 * @returns The configured Fastify instance
 */
export function buildApp() {
	const app = Fastify({
		logger: true,
	}).withTypeProvider<JsonSchemaToTsProvider>();

	app.register(sensible);

	registerCors(app);

	app.get("/", (_, reply) => {
		reply.send("ok");
	});

	registerAuthRoutes(app);

	app.register(appRoutes, {
		prefix: "/api",
	});

	return app;
}

const appRoutes: FastifyPluginAsyncJsonSchemaToTs = async (app) => {
	app.register(registerWorkspaceRoutes);
};
