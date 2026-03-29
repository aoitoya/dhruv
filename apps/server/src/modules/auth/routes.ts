import type { FastifyInstance } from "fastify";
import { getSession, handleAuthRequest } from "./controller.js";

export async function authRoutes(app: FastifyInstance): Promise<void> {
	app.route({
		method: ["GET", "POST"],
		url: "/api/auth/*",
		handler: handleAuthRequest,
	});

	app.get("/api/me", getSession);
}
