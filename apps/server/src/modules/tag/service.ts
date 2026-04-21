import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { tag, taskTag } from "../../db/schema/index.js";
import { workspaceService } from "../workspace/service.js";

class TagService {
	async create(workspaceId: string, name: string, color?: string) {
		const [newTag] = await db
			.insert(tag)
			.values({
				workspaceId,
				name,
				color: color ?? "#6366F1",
			})
			.returning();

		return newTag;
	}

	async getByWorkspace(workspaceId: string) {
		return db
			.select({
				id: tag.id,
				workspaceId: tag.workspaceId,
				name: tag.name,
				color: tag.color,
				createdAt: tag.createdAt,
			})
			.from(tag)
			.where(eq(tag.workspaceId, workspaceId));
	}

	async getById(tagId: string) {
		const [result] = await db
			.select({
				id: tag.id,
				workspaceId: tag.workspaceId,
				name: tag.name,
				color: tag.color,
				createdAt: tag.createdAt,
			})
			.from(tag)
			.where(eq(tag.id, tagId));

		return result ?? null;
	}

	async update(tagId: string, data: { name?: string; color?: string }) {
		const [updated] = await db
			.update(tag)
			.set({
				...data,
				updatedAt: new Date(),
			})
			.where(eq(tag.id, tagId))
			.returning();

		return updated;
	}

	async delete(tagId: string) {
		await db.delete(tag).where(eq(tag.id, tagId));
	}

	async getTagsForTask(taskId: string) {
		return db
			.select({
				id: tag.id,
				workspaceId: tag.workspaceId,
				name: tag.name,
				color: tag.color,
			})
			.from(taskTag)
			.where(eq(taskTag.taskId, taskId))
			.leftJoin(tag, eq(taskTag.tagId, tag.id));
	}

	async addTagsToTask(taskId: string, tagIds: string[]) {
		for (const tagId of tagIds) {
			await db.insert(taskTag).values({ taskId, tagId });
		}
	}

	async removeTagFromTask(taskId: string, tagId: string) {
		await db
			.delete(taskTag)
			.where(and(eq(taskTag.taskId, taskId), eq(taskTag.tagId, tagId)));
	}

	async isAdminOrOwner(workspaceId: string, userId: string) {
		return workspaceService.isAdminOrOwner(workspaceId, userId);
	}

	async isActiveMember(workspaceId: string, userId: string) {
		return workspaceService.isActiveMember(workspaceId, userId);
	}
}

export const tagService = new TagService();
