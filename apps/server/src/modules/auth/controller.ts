import { fromNodeHeaders } from "better-auth/node";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthenticatedRequest } from "../../types/fastify.js";
import { auth } from "./service.js";

export async function requireAuth(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const session = await auth.api.getSession({
		headers: fromNodeHeaders(request.headers),
	});
	if (!session) {
		return reply.status(401).send({ error: "Unauthorized" });
	}
	request.session = session;
}

/**
 * Retrieves the current authentication session from the request and returns it.
 *
 * This function does not set any HTTP status or send an error response.
 * Use {@link requireAuth} to enforce authorization - it will respond with 401 when the session is missing.
 */
export function getSession(_request: FastifyRequest, reply: FastifyReply) {
	const request = _request as AuthenticatedRequest;
	reply.send(request.session);
}

/**
 * Proxies a Fastify request to the better-auth and forwards its HTTP response to the client.
 */
export async function handleAuthRequest(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const url = new URL(request.url, `http://${request.headers.host}`);

	const headers = new Headers();
	for (const key in request.headers) {
		const value = request.headers[key];
		if (value) {
			headers.append(key, value.toString());
		}
	}

	const req = new Request(url.toString(), {
		method: request.method,
		headers,
		...(request.body ? { body: JSON.stringify(request.body) } : {}),
	});

	const response = await auth.handler(req);

	reply.status(response.status);
	response.headers.forEach((value, key) => {
		reply.header(key, value);
	});

	reply.send(response.body ? await response.text() : null);
}
