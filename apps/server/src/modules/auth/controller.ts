import { fromNodeHeaders } from "better-auth/node";
import type { FastifyReply, FastifyRequest } from "fastify";
import { auth } from "./service.js";

export async function getSession(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const session = await auth.api.getSession({
		headers: fromNodeHeaders(request.headers),
	});
	if (!session) {
		reply.status(401).send({ error: "Unauthorized" });
		return;
	}
	reply.send(session);
}

export async function handleAuthRequest(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
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
