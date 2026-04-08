import type { FastifyPluginAsyncJsonSchemaToTs } from "@fastify/type-provider-json-schema-to-ts";
import type { AuthenticatedRequest } from "../../types/fastify.js";
import { projectService } from "../project/service.js";
import { taskService } from "./service.js";

export const registerTaskRoutes: FastifyPluginAsyncJsonSchemaToTs = async (
	app,
) => {
	app.addHook("onRequest", async (request, reply) => {
		await app.requireAuth(request, reply);
	});

	app.post(
		"/projects/:projectId/tasks",
		{
			schema: {
				params: {
					type: "object",
					properties: {
						projectId: { type: "string", format: "uuid" },
					},
					required: ["projectId"],
				},
				body: {
					type: "object",
					properties: {
						title: { type: "string" },
						description: { type: "string" },
						status: {
							type: "string",
							enum: ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"],
						},
						priority: {
							type: "string",
							enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
						},
						assigneeId: { type: "string" },
						dueDate: { type: "string", format: "date" },
						parentTaskId: { type: "string", format: "uuid" },
					},
					required: ["title"],
				},
			},
		},
		async (request, reply) => {
			const session = (request as AuthenticatedRequest).session;
			const userId = session.user.id;
			const projectId = request.params.projectId;

			const isMember = await projectService.isMember(projectId, userId);
			if (!isMember) {
				reply.status(403).send({ success: false, error: "FORBIDDEN" });
				return;
			}

			const task = await taskService.create(
				projectId,
				request.body.title,
				userId,
				{
					description: request.body.description,
					status: request.body.status,
					priority: request.body.priority,
					assigneeId: request.body.assigneeId,
					dueDate: request.body.dueDate,
					parentTaskId: request.body.parentTaskId,
				},
			);

			reply.send({ success: true, data: task });
		},
	);

	app.get(
		"/projects/:projectId/tasks",
		{
			schema: {
				params: {
					type: "object",
					properties: {
						projectId: { type: "string", format: "uuid" },
					},
					required: ["projectId"],
				},
			},
		},
		async (request, reply) => {
			const session = (request as AuthenticatedRequest).session;
			const userId = session.user.id;
			const projectId = request.params.projectId;

			const isMember = await projectService.isMember(projectId, userId);
			if (!isMember) {
				reply.status(403).send({ success: false, error: "FORBIDDEN" });
				return;
			}

			const tasks = await taskService.getByProject(projectId);
			reply.send({ success: true, data: tasks });
		},
	);

	app.get(
		"/tasks/:id",
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
			const taskId = request.params.id;

			const task = await taskService.getById(taskId);
			if (!task) {
				reply.status(404).send({ success: false, error: "NOT_FOUND" });
				return;
			}

			const isMember = await projectService.isMember(task.projectId, userId);
			if (!isMember) {
				reply.status(403).send({ success: false, error: "FORBIDDEN" });
				return;
			}

			reply.send({ success: true, data: task });
		},
	);

	app.patch(
		"/tasks/:id",
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
						title: { type: "string" },
						description: { type: "string" },
						status: {
							type: "string",
							enum: ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"],
						},
						priority: {
							type: "string",
							enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
						},
						assigneeId: { type: "string" },
						dueDate: { type: "string", format: "date" },
						parentTaskId: { type: "string", format: "uuid" },
						position: { type: "integer" },
					},
					minProperties: 1,
					additionalProperties: false,
				},
			},
		},
		async (request, reply) => {
			const session = (request as AuthenticatedRequest).session;
			const userId = session.user.id;
			const taskId = request.params.id;

			const task = await taskService.getById(taskId);
			if (!task) {
				reply.status(404).send({ success: false, error: "NOT_FOUND" });
				return;
			}

			const isMember = await projectService.isMember(task.projectId, userId);
			if (!isMember) {
				reply.status(403).send({ success: false, error: "FORBIDDEN" });
				return;
			}

			const updated = await taskService.update(taskId, request.body);
			reply.send({ success: true, data: updated });
		},
	);

	app.delete(
		"/tasks/:id",
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
			const taskId = request.params.id;

			const task = await taskService.getById(taskId);
			if (!task) {
				reply.status(404).send({ success: false, error: "NOT_FOUND" });
				return;
			}

			const isMember = await projectService.isMember(task.projectId, userId);
			if (!isMember) {
				reply.status(403).send({ success: false, error: "FORBIDDEN" });
				return;
			}

			await taskService.delete(taskId);
			reply.send({ success: true });
		},
	);

	app.get(
		"/tasks/:id/subtasks",
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
			const taskId = request.params.id;

			const task = await taskService.getById(taskId);
			if (!task) {
				reply.status(404).send({ success: false, error: "NOT_FOUND" });
				return;
			}

			const isMember = await projectService.isMember(task.projectId, userId);
			if (!isMember) {
				reply.status(403).send({ success: false, error: "FORBIDDEN" });
				return;
			}

			const subtasks = await taskService.getSubtasks(taskId);
			reply.send({ success: true, data: subtasks });
		},
	);
};
