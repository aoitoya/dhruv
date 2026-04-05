import type { FastifyReply, FastifyRequest } from "fastify";
import type { Auth, Session } from "../modules/auth/service.js";

declare module "fastify" {
	interface FastifyInstance {
		auth: Auth;
		requireAuth: (
			request: FastifyRequest,
			reply: FastifyReply,
		) => Promise<void>;
	}

	interface FastifyRequest {
		session?: Session;
	}
}

export interface AuthenticatedRequest extends FastifyRequest {
	session: Session;
}
