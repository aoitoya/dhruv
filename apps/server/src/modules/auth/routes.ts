import type { FastifyInstance } from "fastify";
import { getSession, handleAuthRequest, requireAuth } from "./controller.js";
import { auth } from "./service.js";

/**
 * Register authentication-related HTTP routes on the given Fastify instance.
 *
 * Registers a wildcard `GET`/`POST` route at `/api/auth/*` that forwards requests to `handleAuthRequest`,
 * and a `GET` route at `/api/me` that forwards requests to `getSession`.
 *
 * @param app - Fastify instance used to register the routes
 */
export function registerAuthRoutes(app: FastifyInstance) {
	app.decorate("auth", auth);

	app.decorate("requireAuth", requireAuth);

	app.route({
		method: ["GET", "POST"],
		url: "/api/auth/*",
		handler: handleAuthRequest,
	});

	app.get("/api/me", {
		handler: getSession,
		onRequest: [app.requireAuth],
	});
}
