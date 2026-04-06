import type { FastifyPluginAsyncJsonSchemaToTs } from "@fastify/type-provider-json-schema-to-ts";
import type { AuthenticatedRequest } from "../../types/fastify.js";
import { workspaceService } from "./service.js";

export const registerWorkspaceRoutes: FastifyPluginAsyncJsonSchemaToTs = async (
	app,
) => {
	app.addHook("onRequest", async (request, reply) => {
		await app.requireAuth(request, reply);
	});

	app.get("/workspaces", async (request, reply) => {
		const session = (request as AuthenticatedRequest).session;
		const userId = session.user.id;

		const workspaces = await workspaceService.getAll(userId);

		reply.send({
			success: true,
			data: workspaces,
		});
	});
	app.post(
		"/workspaces",
		{
			schema: {
				body: {
					type: "object",
					properties: {
						name: { type: "string" },
					},
					required: ["name"],
				} as const,
			},
		},
		async (request, reply) => {
			const session = (request as AuthenticatedRequest).session;
			const userId = session.user.id;
			const newWorkspaceName = request.body.name;

			const newWorkspace = await workspaceService.create(
				newWorkspaceName,
				userId,
			);

			reply.send({
				success: true,
				data: newWorkspace,
			});
		},
	);
	app.get(
		"/workspaces/:id",
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
			const workspaceId = request.params.id;

			const isActiveMember = await workspaceService.isActiveMember(
				workspaceId,
				userId,
			);

			if (!isActiveMember) {
				reply.status(403).send({
					success: false,
					error: "FORBIDDEN",
				});
				return;
			}

			const fetchedWorkspace = await workspaceService.getOneById(workspaceId);

			reply.send({
				success: true,
				data: fetchedWorkspace,
			});
		},
	);
	app.patch(
		"/workspaces/:id",
		{
			schema: {
				params: {
					type: "object",
					properties: {
						id: {
							type: "string",
						},
					},
					required: ["id"],
				},
				body: {
					type: "object",
					properties: {
						name: {
							type: "string",
						},
					},
					required: ["name"],
				},
			},
		},
		async (request, reply) => {
			const session = (request as AuthenticatedRequest).session;
			const userId = session.user.id;
			const workspaceId = request.params.id;
			const updatedName = request.body.name;

			const isOwner = await workspaceService.isOwner(workspaceId, userId);

			if (!isOwner) {
				reply.status(403).send({
					success: false,
					error: "FORBIDDEN",
				});
				return;
			}

			await workspaceService.updateOne(workspaceId, { name: updatedName });

			reply.send({
				success: true,
			});
		},
	);
	app.delete(
		"/workspaces/:id",
		{
			schema: {
				params: {
					type: "object",
					properties: {
						id: {
							type: "string",
						},
					},
					required: ["id"],
				},
			},
		},
		async (request, reply) => {
			const session = (request as AuthenticatedRequest).session;
			const userId = session.user.id;
			const workspaceId = request.params.id;

			const isOwner = await workspaceService.isOwner(workspaceId, userId);

			if (!isOwner) {
				reply.status(403).send({
					success: false,
					error: "FORBIDDEN",
				});
				return;
			}

			await workspaceService.deleteOne(workspaceId);

			reply.send({
				success: true,
			});
		},
	);

	app.post(
		"/workspaces/:id/invite",
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
			const workspaceId = request.params.id;
			const userIds = request.body.userIds;

			const isAdminOrOwner = await workspaceService.isAdminOrOwner(
				workspaceId,
				userId,
			);
			if (!isAdminOrOwner) {
				reply.status(403).send({ success: false, error: "FORBIDDEN" });
				return;
			}

			await workspaceService.inviteMembers(workspaceId, userIds);

			reply.send({ success: true });
		},
	);

	app.get(
		"/workspaces/:id/invites",
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
			const workspaceId = request.params.id;

			const isAdminOrOwner = await workspaceService.isAdminOrOwner(
				workspaceId,
				userId,
			);
			if (!isAdminOrOwner) {
				reply.status(403).send({ success: false, error: "FORBIDDEN" });
				return;
			}

			const invites =
				await workspaceService.getInvitesForWorkspace(workspaceId);

			reply.send({ success: true, data: invites });
		},
	);

	app.get("/invites", async (request, reply) => {
		const session = (request as AuthenticatedRequest).session;
		const userId = session.user.id;

		const invites = await workspaceService.getInvitesForUser(userId);

		reply.send({ success: true, data: invites });
	});

	app.post(
		"/invites/:workspaceId/response",
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
						action: { type: "string", enum: ["accept", "reject"] },
					},
					required: ["action"],
				},
			},
		},
		async (request, reply) => {
			const session = (request as AuthenticatedRequest).session;
			const userId = session.user.id;
			const workspaceId = request.params.workspaceId;
			const action = request.body.action;

			await workspaceService.responseWorkspaceInvite(
				workspaceId,
				userId,
				action,
			);
			reply.send({ success: true });
		},
	);

	app.get(
		"/workspaces/:id/members",
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
			const workspaceId = request.params.id;

			const isActiveMember = await workspaceService.isActiveMember(
				workspaceId,
				userId,
			);

			if (!isActiveMember) {
				reply.status(403).send({ success: false, error: "FORBIDDEN" });
				return;
			}

			const members = await workspaceService.getMembers(workspaceId);
			reply.send({ success: true, data: members });
		},
	);

	app.delete(
		"/workspaces/:id/members/:userId",
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
			const workspaceId = request.params.id;
			const memberUserId = request.params.userId;

			const currentUserRole = await workspaceService.getMemberRole(
				workspaceId,
				userId,
			);
			const targetRole = await workspaceService.getMemberRole(
				workspaceId,
				memberUserId,
			);

			const isOwner = currentUserRole === "OWNER";
			const isAdmin =
				currentUserRole === "ADMIN" || currentUserRole === "OWNER";

			if (!isAdmin) {
				reply.status(403).send({ success: false, error: "FORBIDDEN" });
				return;
			}

			if (targetRole === "OWNER") {
				reply.status(403).send({
					success: false,
					error: "Cannot remove owner",
				});
				return;
			}

			if (targetRole === "ADMIN" && !isOwner) {
				reply.status(403).send({
					success: false,
					error: "Only owner can remove admins",
				});
				return;
			}

			await workspaceService.removeMember(workspaceId, memberUserId);
			reply.send({ success: true });
		},
	);

	app.patch(
		"/workspaces/:id/members/:userId",
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
				body: {
					type: "object",
					properties: {
						role: { type: "string", enum: ["ADMIN", "MEMBER", "OWNER"] },
					},
					required: ["role"],
				},
			},
		},
		async (request, reply) => {
			const session = (request as AuthenticatedRequest).session;
			const userId = session.user.id;
			const workspaceId = request.params.id;
			const memberUserId = request.params.userId;
			const newRole = request.body.role;

			const currentUserRole = await workspaceService.getMemberRole(
				workspaceId,
				userId,
			);
			const targetRole = await workspaceService.getMemberRole(
				workspaceId,
				memberUserId,
			);

			if (currentUserRole !== "OWNER") {
				reply.status(403).send({ success: false, error: "FORBIDDEN" });
				return;
			}

			if (targetRole === "OWNER") {
				reply.status(403).send({
					success: false,
					error: "Cannot change owner role",
				});
				return;
			}

			if (newRole === "OWNER") {
				await workspaceService.transferOwnership(
					workspaceId,
					userId,
					memberUserId,
				);
			} else {
				await workspaceService.updateMemberRole(
					workspaceId,
					memberUserId,
					newRole,
				);
			}

			reply.send({ success: true });
		},
	);

	app.post(
		"/workspaces/:id/leave",
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
			const workspaceId = request.params.id;

			const currentRole = await workspaceService.getMemberRole(
				workspaceId,
				userId,
			);

			if (currentRole === "OWNER") {
				reply.status(400).send({
					success: false,
					error: "Owner must transfer ownership before leaving",
				});
				return;
			}

			await workspaceService.leaveWorkspace(workspaceId, userId);
			reply.send({ success: true });
		},
	);
};
