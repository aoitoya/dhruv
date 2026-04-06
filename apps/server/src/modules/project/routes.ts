import type { FastifyPluginAsyncJsonSchemaToTs } from "@fastify/type-provider-json-schema-to-ts";
import type { AuthenticatedRequest } from "../../types/fastify.js";
import { workspaceService } from "../workspace/service.js";
import { projectService } from "./service.js";

export const registerProjectRoutes: FastifyPluginAsyncJsonSchemaToTs = async (
	app,
) => {
	app.addHook("onRequest", async (request, reply) => {
		await app.requireAuth(request, reply);
	});

	app.get(
		"/workspaces/:workspaceId/projects",
		{
			schema: {
				params: {
					type: "object",
					properties: {
						workspaceId: { type: "string" },
					},
					required: ["workspaceId"],
				},
			},
		},
		async (request, reply) => {
			const session = (request as AuthenticatedRequest).session;
			const userId = session.user.id;
			const workspaceId = request.params.workspaceId;

			const isActiveMember = await workspaceService.isActiveMember(
				workspaceId,
				userId,
			);

			if (!isActiveMember) {
				reply.status(403).send({ success: false, error: "FORBIDDEN" });
				return;
			}

			const projects = await projectService.getByWorkspace(workspaceId, userId);
			reply.send({ success: true, data: projects });
		},
	);

	app.post(
		"/workspaces/:workspaceId/projects",
		{
			schema: {
				params: {
					type: "object",
					properties: {
						workspaceId: { type: "string" },
					},
					required: ["workspaceId"],
				},
				body: {
					type: "object",
					properties: {
						name: { type: "string" },
						description: { type: "string" },
						color: { type: "string" },
						dueDate: { type: "string" },
					},
					required: ["name"],
				},
			},
		},
		async (request, reply) => {
			const session = (request as AuthenticatedRequest).session;
			const userId = session.user.id;
			const workspaceId = request.params.workspaceId;

			const isAdminOrOwner = await workspaceService.isOwner(
				workspaceId,
				userId,
			);

			if (!isAdminOrOwner) {
				reply.status(403).send({ success: false, error: "FORBIDDEN" });
				return;
			}

			const newProject = await projectService.create(
				workspaceId,
				request.body.name,
				userId,
				{
					description: request.body.description,
					color: request.body.color,
					dueDate: request.body.dueDate,
				},
			);

			reply.send({ success: true, data: newProject });
		},
	);

	app.get(
		"/projects/:id",
		{
			schema: {
				params: {
					type: "object",
					properties: {
						id: { type: "string" },
					},
					required: ["id"],
				},
			},
		},
		async (request, reply) => {
			const session = (request as AuthenticatedRequest).session;
			const userId = session.user.id;
			const projectId = request.params.id;

			const isMember = await projectService.isMember(projectId, userId);

			if (!isMember) {
				reply.status(403).send({ success: false, error: "FORBIDDEN" });
				return;
			}

			const fetchedProject = await projectService.getById(projectId);
			reply.send({ success: true, data: fetchedProject });
		},
	);

	app.patch(
		"/projects/:id",
		{
			schema: {
				params: {
					type: "object",
					properties: {
						id: { type: "string" },
					},
					required: ["id"],
				},
				body: {
					type: "object",
					properties: {
						name: { type: "string" },
						description: { type: "string" },
						status: { type: "string", enum: ["ACTIVE", "ARCHIVED"] },
						color: { type: "string" },
						dueDate: { type: "string" },
					},
				},
			},
		},
		async (request, reply) => {
			const session = (request as AuthenticatedRequest).session;
			const userId = session.user.id;
			const projectId = request.params.id;

			const isAdminOrOwner = await workspaceService.isAdminOrOwner(
				projectId,
				userId,
			);

			if (!isAdminOrOwner) {
				reply.status(403).send({ success: false, error: "FORBIDDEN" });
				return;
			}

			await projectService.update(projectId, request.body);
			reply.send({ success: true });
		},
	);

	app.delete(
		"/projects/:id",
		{
			schema: {
				params: {
					type: "object",
					properties: {
						id: { type: "string" },
					},
					required: ["id"],
				},
			},
		},
		async (request, reply) => {
			const session = (request as AuthenticatedRequest).session;
			const userId = session.user.id;
			const projectId = request.params.id;

			const isAdminOrOwner = await workspaceService.isOwner(projectId, userId);

			if (!isAdminOrOwner) {
				reply.status(403).send({ success: false, error: "FORBIDDEN" });
				return;
			}

			await projectService.delete(projectId);
			reply.send({ success: true });
		},
	);

	app.get(
		"/projects/:id/members",
		{
			schema: {
				params: {
					type: "object",
					properties: {
						id: { type: "string" },
					},
					required: ["id"],
				},
			},
		},
		async (request, reply) => {
			const session = (request as AuthenticatedRequest).session;
			const userId = session.user.id;
			const projectId = request.params.id;

			const isMember = await projectService.isMember(projectId, userId);

			if (!isMember) {
				reply.status(403).send({ success: false, error: "FORBIDDEN" });
				return;
			}

			const members = await projectService.getMembers(projectId);
			reply.send({ success: true, data: members });
		},
	);

	app.post(
		"/projects/:id/members",
		{
			schema: {
				params: {
					type: "object",
					properties: {
						id: { type: "string" },
					},
					required: ["id"],
				},
				body: {
					type: "object",
					properties: {
						userIds: {
							type: "array",
							items: { type: "string" },
						},
					},
					required: ["userIds"],
				},
			},
		},
		async (request, reply) => {
			const session = (request as AuthenticatedRequest).session;
			const userId = session.user.id;
			const projectId = request.params.id;
			const userIds = request.body.userIds;

			const isAdminOrOwner = await workspaceService.isAdminOrOwner(
				projectId,
				userId,
			);

			if (!isAdminOrOwner) {
				reply.status(403).send({ success: false, error: "FORBIDDEN" });
				return;
			}

			const workspaceId = await projectService.getWorkspaceId(projectId);

			if (!workspaceId) {
				reply.status(404).send({ success: false, error: "NOT_FOUND" });
				return;
			}

			const remainingMembers =
				await projectService.getNonProjectWorkspaceMembers(
					projectId,
					workspaceId,
				);
			const remainingMemberIds = new Set(
				remainingMembers.map((mem) => mem.workspace_member.userId),
			);

			const validUserIds = userIds.filter((id) => remainingMemberIds.has(id));

			for (const uid of validUserIds) {
				await projectService.addMember(projectId, workspaceId, uid);
			}

			reply.send({ success: true });
		},
	);

	app.delete(
		"/projects/:id/members/:userId",
		{
			schema: {
				params: {
					type: "object",
					properties: {
						id: { type: "string" },
						userId: { type: "string" },
					},
					required: ["id", "userId"],
				},
			},
		},
		async (request, reply) => {
			const session = (request as AuthenticatedRequest).session;
			const userId = session.user.id;
			const projectId = request.params.id;
			const memberUserId = request.params.userId;

			const workspaceId = await projectService.getWorkspaceId(projectId);
			if (!workspaceId) {
				reply.status(404).send({ success: false, error: "NOT_FOUND" });
				return;
			}

			const isAdminOrOwner = await workspaceService.isAdminOrOwner(
				workspaceId,
				userId,
			);

			if (!isAdminOrOwner) {
				reply.status(403).send({ success: false, error: "FORBIDDEN" });
				return;
			}

			await projectService.removeMember(projectId, memberUserId);
			reply.send({ success: true });
		},
	);
};
