import type { FastifyPluginAsyncJsonSchemaToTs } from "@fastify/type-provider-json-schema-to-ts";
import type { AuthenticatedRequest } from "../../types/fastify.js";
import { tagService } from "./service.js";

export const registerTagRoutes: FastifyPluginAsyncJsonSchemaToTs = async (
	app,
) => {
	app.addHook("onRequest", app.requireAuth);

	app.get(
		"/workspaces/:workspaceId/tags",
		{
			schema: {
				params: {
					type: "object",
					properties: {
						workspaceId: { type: "string", format: "uuid" },
					},
					required: ["workspaceId"],
				},
			},
		},
		async (request, reply) => {
			const session = (request as AuthenticatedRequest).session;
			const userId = session.user.id;
			const workspaceId = request.params.workspaceId;

			const isActiveMember = await tagService.isActiveMember(
				workspaceId,
				userId,
			);
			if (!isActiveMember) {
				reply.status(403).send({ success: false, error: "FORBIDDEN" });
				return;
			}

			const tags = await tagService.getByWorkspace(workspaceId);
			reply.send({ success: true, data: tags });
		},
	);

	app.post(
		"/workspaces/:workspaceId/tags",
		{
			schema: {
				params: {
					type: "object",
					properties: {
						workspaceId: { type: "string", format: "uuid" },
					},
					required: ["workspaceId"],
				},
				body: {
					type: "object",
					properties: {
						name: { type: "string", minLength: 1, maxLength: 100 },
						color: { type: "string" },
					},
					required: ["name"],
				},
			},
		},
		async (request, reply) => {
			const session = (request as AuthenticatedRequest).session;
			const userId = session.user.id;
			const workspaceId = request.params.workspaceId;
			const { name, color } = request.body;

			const isAdminOrOwner = await tagService.isAdminOrOwner(
				workspaceId,
				userId,
			);
			if (!isAdminOrOwner) {
				reply.status(403).send({ success: false, error: "FORBIDDEN" });
				return;
			}

			try {
				const newTag = await tagService.create(workspaceId, name, color);
				reply.send({ success: true, data: newTag });
			} catch (_err) {
				reply.status(400).send({
					success: false,
					error: "Tag with this name already exists",
				});
			}
		},
	);

	app.patch(
		"/tags/:id",
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
						name: { type: "string", minLength: 1, maxLength: 100 },
						color: { type: "string" },
					},
					minProperties: 1,
					additionalProperties: false,
				},
			},
		},
		async (request, reply) => {
			const session = (request as AuthenticatedRequest).session;
			const userId = session.user.id;
			const tagId = request.params.id;

			const existingTag = await tagService.getById(tagId);
			if (!existingTag) {
				reply.status(404).send({ success: false, error: "NOT_FOUND" });
				return;
			}

			const isAdminOrOwner = await tagService.isAdminOrOwner(
				existingTag.workspaceId,
				userId,
			);
			if (!isAdminOrOwner) {
				reply.status(403).send({ success: false, error: "FORBIDDEN" });
				return;
			}

			const updated = await tagService.update(tagId, request.body);
			reply.send({ success: true, data: updated });
		},
	);

	app.delete(
		"/tags/:id",
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
			const tagId = request.params.id;

			const existingTag = await tagService.getById(tagId);
			if (!existingTag) {
				reply.status(404).send({ success: false, error: "NOT_FOUND" });
				return;
			}

			const isAdminOrOwner = await tagService.isAdminOrOwner(
				existingTag.workspaceId,
				userId,
			);
			if (!isAdminOrOwner) {
				reply.status(403).send({ success: false, error: "FORBIDDEN" });
				return;
			}

			await tagService.delete(tagId);
			reply.send({ success: true });
		},
	);

	app.get(
		"/tasks/:taskId/tags",
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
			const taskId = request.params.taskId;

			const tags = await tagService.getTagsForTask(taskId);
			reply.send({ success: true, data: tags });
		},
	);

	app.post(
		"/tasks/:taskId/tags",
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
						tagIds: {
							type: "array",
							items: { type: "string", format: "uuid" },
						},
					},
					required: ["tagIds"],
				},
			},
		},
		async (request, reply) => {
			const taskId = request.params.taskId;
			const tagIds = request.body.tagIds;

			await tagService.addTagsToTask(taskId, tagIds);
			reply.send({ success: true });
		},
	);

	app.delete(
		"/tasks/:taskId/tags/:tagId",
		{
			schema: {
				params: {
					type: "object",
					properties: {
						taskId: { type: "string", format: "uuid" },
						tagId: { type: "string", format: "uuid" },
					},
					required: ["taskId", "tagId"],
				},
			},
		},
		async (request, reply) => {
			const taskId = request.params.taskId;
			const tagId = request.params.tagId;

			await tagService.removeTagFromTask(taskId, tagId);
			reply.send({ success: true });
		},
	);
};
