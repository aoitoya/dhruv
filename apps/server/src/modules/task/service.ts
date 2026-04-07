import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
	projectMember,
	task,
	type taskPriority,
	type taskStatus,
	user,
} from "../../db/schema/index.js";

export class TaskService {
	async create(
		projectId: string,
		title: string,
		createdBy: string,
		data?: {
			description?: string;
			status?: (typeof taskStatus.enumValues)[number];
			priority?: (typeof taskPriority.enumValues)[number];
			assigneeId?: string;
			dueDate?: string;
			parentTaskId?: string;
		},
	) {
		const maxPositionResult = await db
			.select({ position: task.position })
			.from(task)
			.where(
				and(
					eq(task.projectId, projectId),
					data?.status ? eq(task.status, data.status) : undefined,
				),
			)
			.orderBy(sql`${task.position} desc`)
			.limit(1);

		const position = (maxPositionResult[0]?.position ?? 0) + 1000;

		const [createdTask] = await db
			.insert(task)
			.values({
				projectId,
				title,
				createdBy,
				description: data?.description,
				status: data?.status ?? "todo",
				priority: data?.priority,
				assigneeId: data?.assigneeId,
				dueDate: data?.dueDate,
				parentTaskId: data?.parentTaskId,
				position,
			})
			.returning();

		return createdTask;
	}

	async getById(id: string) {
		const [result] = await db
			.select({
				id: task.id,
				projectId: task.projectId,
				parentTaskId: task.parentTaskId,
				title: task.title,
				description: task.description,
				status: task.status,
				priority: task.priority,
				assigneeId: task.assigneeId,
				dueDate: task.dueDate,
				position: task.position,
				createdBy: task.createdBy,
				createdAt: task.createdAt,
				updatedAt: task.updatedAt,
				assigneeName: user.name,
				assigneeEmail: user.email,
			})
			.from(task)
			.leftJoin(user, eq(task.assigneeId, user.id))
			.where(eq(task.id, id));

		return result;
	}

	async getByProject(projectId: string) {
		return db
			.select({
				id: task.id,
				projectId: task.projectId,
				parentTaskId: task.parentTaskId,
				title: task.title,
				description: task.description,
				status: task.status,
				priority: task.priority,
				assigneeId: task.assigneeId,
				dueDate: task.dueDate,
				position: task.position,
				createdBy: task.createdBy,
				createdAt: task.createdAt,
				updatedAt: task.updatedAt,
				assigneeName: user.name,
				assigneeEmail: user.email,
			})
			.from(task)
			.leftJoin(user, eq(task.assigneeId, user.id))
			.where(eq(task.projectId, projectId))
			.orderBy(task.position);
	}

	async update(
		id: string,
		data: {
			title?: string;
			description?: string;
			status?: (typeof taskStatus.enumValues)[number];
			priority?: (typeof taskPriority.enumValues)[number];
			assigneeId?: string | null;
			dueDate?: string | null;
			parentTaskId?: string | null;
			position?: number;
		},
	) {
		const [updated] = await db
			.update(task)
			.set(data)
			.where(eq(task.id, id))
			.returning();

		return updated;
	}

	async delete(id: string) {
		await db.delete(task).where(eq(task.id, id));
	}

	async getSubtasks(parentTaskId: string) {
		return db
			.select({
				id: task.id,
				projectId: task.projectId,
				parentTaskId: task.parentTaskId,
				title: task.title,
				description: task.description,
				status: task.status,
				priority: task.priority,
				assigneeId: task.assigneeId,
				dueDate: task.dueDate,
				position: task.position,
				createdBy: task.createdBy,
				createdAt: task.createdAt,
				updatedAt: task.updatedAt,
			})
			.from(task)
			.where(eq(task.parentTaskId, parentTaskId))
			.orderBy(task.position);
	}

	async assignMember(projectId: string, userId: string) {
		const [projectMemberRow] = await db
			.select()
			.from(projectMember)
			.where(
				and(
					eq(projectMember.projectId, projectId),
					eq(projectMember.userId, userId),
				),
			)
			.limit(1);

		return !!projectMemberRow;
	}

	async reorder(taskId: string, newPosition: number) {
		const [updated] = await db
			.update(task)
			.set({ position: newPosition })
			.where(eq(task.id, taskId))
			.returning();

		return updated;
	}

	async reindex(
		projectId: string,
		status: (typeof taskStatus.enumValues)[number],
	) {
		const tasks = await db
			.select({ id: task.id, position: task.position })
			.from(task)
			.where(and(eq(task.projectId, projectId), eq(task.status, status)))
			.orderBy(task.position);

		let position = 1000;
		for (const t of tasks) {
			if (t.position - position < 1) {
				position = t.position + 1000;
				await db.update(task).set({ position }).where(eq(task.id, t.id));
			} else {
				position = t.position;
			}
		}
	}
}

export const taskService = new TaskService();
