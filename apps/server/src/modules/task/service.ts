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
		return await db.transaction(async (tx) => {
			const maxPositionResult = await tx
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

			const [createdTask] = await tx
				.insert(task)
				.values({
					projectId,
					title,
					createdBy,
					description: data?.description,
					status: data?.status ?? "TODO",
					priority: data?.priority,
					assigneeId: data?.assigneeId,
					dueDate: data?.dueDate,
					parentTaskId: data?.parentTaskId,
					position,
				})
				.returning();

			return createdTask;
		});
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

	async reindex(
		projectId: string,
		status: (typeof taskStatus.enumValues)[number],
	) {
		const tasks = await db
			.select({ id: task.id })
			.from(task)
			.where(and(eq(task.projectId, projectId), eq(task.status, status)))
			.orderBy(task.position);

		await db.transaction(async (tx) => {
			let position = 1000;
			for (const t of tasks) {
				await tx.update(task).set({ position }).where(eq(task.id, t.id));
				position += 1000;
			}
		});
	}

	async reorder(id: string, position: number) {
		const [updated] = await db
			.update(task)
			.set({ position })
			.where(eq(task.id, id))
			.returning();

		return updated;
	}
}

export const taskService = new TaskService();
