import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { comment, projectMember, task, user } from "../../db/schema/index.js";

export class CommentService {
	async create(taskId: string, authorId: string, content: string) {
		const [created] = await db
			.insert(comment)
			.values({
				taskId,
				authorId,
				content,
			})
			.returning();

		return created;
	}

	async getByTask(taskId: string) {
		return db
			.select({
				id: comment.id,
				taskId: comment.taskId,
				authorId: comment.authorId,
				content: comment.content,
				createdAt: comment.createdAt,
				updatedAt: comment.updatedAt,
				authorName: user.name,
				authorEmail: user.email,
			})
			.from(comment)
			.leftJoin(user, eq(comment.authorId, user.id))
			.where(eq(comment.taskId, taskId))
			.orderBy(comment.createdAt);
	}

	async getById(id: string) {
		const [result] = await db
			.select({
				id: comment.id,
				taskId: comment.taskId,
				authorId: comment.authorId,
				content: comment.content,
				createdAt: comment.createdAt,
				updatedAt: comment.updatedAt,
			})
			.from(comment)
			.where(eq(comment.id, id));

		return result;
	}

	async update(id: string, content: string) {
		const [updated] = await db
			.update(comment)
			.set({ content })
			.where(eq(comment.id, id))
			.returning();

		return updated;
	}

	async delete(id: string) {
		await db.delete(comment).where(eq(comment.id, id));
	}

	async canAccessTask(userId: string, taskId: string) {
		const [taskRow] = await db
			.select({ projectId: task.projectId })
			.from(task)
			.where(eq(task.id, taskId))
			.limit(1);

		if (!taskRow) return false;

		const [member] = await db
			.select()
			.from(projectMember)
			.where(
				and(
					eq(projectMember.projectId, taskRow.projectId),
					eq(projectMember.userId, userId),
				),
			)
			.limit(1);

		return !!member;
	}
}

export const commentService = new CommentService();
