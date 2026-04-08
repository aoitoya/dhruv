import type { FastifyPluginAsyncJsonSchemaToTs } from "@fastify/type-provider-json-schema-to-ts";
import type { AuthenticatedRequest } from "../../types/fastify.js";
import { commentService } from "./service.js";

export const registerCommentRoutes: FastifyPluginAsyncJsonSchemaToTs = async (
	app,
) => {
	app.addHook("onRequest", async (request, reply) => {
		await app.requireAuth(request, reply);
	});

	app.post(
		"/tasks/:taskId/comments",
		{
			schema: {
				params: {
					type: "object",
					properties: {
						taskId: { type: "string", format: "uuid" },
					},
					required: ["taskId"],
				},
				body: {
					type: "object",
					properties: {
						content: { type: "string" },
					},
					required: ["content"],
				},
			},
		},
		async (request, reply) => {
			const session = (request as AuthenticatedRequest).session;
			const userId = session.user.id;
			const taskId = request.params.taskId;

			const canAccess = await commentService.canAccessTask(userId, taskId);
			if (!canAccess) {
				reply.status(403).send({ success: false, error: "FORBIDDEN" });
				return;
			}

			const newComment = await commentService.create(
				taskId,
				userId,
				request.body.content,
			);
			reply.send({ success: true, data: newComment });
		},
	);

	app.get(
		"/tasks/:taskId/comments",
		{
			schema: {
				params: {
					type: "object",
					properties: {
						taskId: { type: "string", format: "uuid" },
					},
					required: ["taskId"],
				},
			},
		},
		async (request, reply) => {
			const session = (request as AuthenticatedRequest).session;
			const userId = session.user.id;
			const taskId = request.params.taskId;

			const canAccess = await commentService.canAccessTask(userId, taskId);
			if (!canAccess) {
				reply.status(403).send({ success: false, error: "FORBIDDEN" });
				return;
			}

			const comments = await commentService.getByTask(taskId);
			reply.send({ success: true, data: comments });
		},
	);

	app.patch(
		"/comments/:id",
		{
			schema: {
				params: {
					type: "object",
					properties: {
						id: { type: "string", format: "uuid" },
					},
					required: ["id"],
				},
				body: {
					type: "object",
					properties: {
						content: { type: "string" },
					},
					required: ["content"],
				},
			},
		},
		async (request, reply) => {
			const session = (request as AuthenticatedRequest).session;
			const userId = session.user.id;
			const commentId = request.params.id;

			const existing = await commentService.getById(commentId);
			if (!existing) {
				reply.status(404).send({ success: false, error: "NOT_FOUND" });
				return;
			}

			if (existing.authorId !== userId) {
				reply.status(403).send({ success: false, error: "FORBIDDEN" });
				return;
			}

			const canAccess = await commentService.canAccessTask(
				userId,
				existing.taskId,
			);
			if (!canAccess) {
				reply.status(403).send({ success: false, error: "FORBIDDEN" });
				return;
			}

			const updated = await commentService.update(
				commentId,
				request.body.content,
			);
			reply.send({ success: true, data: updated });
		},
	);

	app.delete(
		"/comments/:id",
		{
			schema: {
				params: {
					type: "object",
					properties: {
						id: { type: "string", format: "uuid" },
					},
					required: ["id"],
				},
			},
		},
		async (request, reply) => {
			const session = (request as AuthenticatedRequest).session;
			const userId = session.user.id;
			const commentId = request.params.id;

			const existing = await commentService.getById(commentId);
			if (!existing) {
				reply.status(404).send({ success: false, error: "NOT_FOUND" });
				return;
			}

			if (existing.authorId !== userId) {
				reply.status(403).send({ success: false, error: "FORBIDDEN" });
				return;
			}

			const canAccess = await commentService.canAccessTask(
				userId,
				existing.taskId,
			);
			if (!canAccess) {
				reply.status(403).send({ success: false, error: "FORBIDDEN" });
				return;
			}

			await commentService.delete(commentId);
			reply.send({ success: true });
		},
	);
};
