import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
	project,
	projectMember,
	user,
	workspaceMember,
} from "../../db/schema/index.js";

class Project {
	async create(
		workspaceId: string,
		name: string,
		userId: string,
		data?: {
			description?: string;
			color?: string;
			dueDate?: string;
		},
	) {
		return await db.transaction(async (tx) => {
			const [newProject] = await tx
				.insert(project)
				.values({
					workspaceId,
					name,
					description: data?.description,
					color: data?.color,
					dueDate: data?.dueDate,
					createdBy: userId,
				})
				.returning();

			if (!newProject) {
				tx.rollback();
				throw new Error("Could not create project");
			}

			await tx.insert(projectMember).values({
				projectId: newProject.id,
				workspaceId,
				userId,
			});

			return newProject;
		});
	}

	async getByWorkspace(workspaceId: string, userId: string) {
		return db
			.select({
				id: project.id,
				workspaceId: project.workspaceId,
				name: project.name,
				description: project.description,
				status: project.status,
				color: project.color,
				dueDate: project.dueDate,
				createdBy: project.createdBy,
				createdAt: project.createdAt,
				updatedAt: project.updatedAt,
			})
			.from(projectMember)
			.where(
				and(
					eq(projectMember.userId, userId),
					eq(projectMember.workspaceId, workspaceId),
				),
			)
			.leftJoin(project, eq(projectMember.projectId, project.id))
			.orderBy(project.updatedAt);
	}

	async getById(projectId: string) {
		const [result] = await db
			.select({
				id: project.id,
				workspaceId: project.workspaceId,
				name: project.name,
				description: project.description,
				status: project.status,
				color: project.color,
				dueDate: project.dueDate,
				createdBy: project.createdBy,
				createdAt: project.createdAt,
				updatedAt: project.updatedAt,
			})
			.from(project)
			.where(eq(project.id, projectId))
			.limit(1);

		return result;
	}

	async update(
		projectId: string,
		data: {
			name?: string;
			description?: string;
			status?: "ACTIVE" | "ARCHIVED";
			color?: string;
			dueDate?: string;
		},
	) {
		const [updated] = await db
			.update(project)
			.set(data)
			.where(eq(project.id, projectId))
			.returning();

		return updated;
	}

	async delete(projectId: string) {
		await db.delete(project).where(eq(project.id, projectId));
	}

	async isMember(projectId: string, userId: string) {
		const [result] = await db
			.select({})
			.from(projectMember)
			.where(
				and(
					eq(projectMember.projectId, projectId),
					eq(projectMember.userId, userId),
				),
			);

		return !!result;
	}

	async getWorkspaceId(projectId: string) {
		const [result] = await db
			.select({ workspaceId: project.workspaceId })
			.from(project)
			.where(eq(project.id, projectId));
		return result?.workspaceId ?? null;
	}

	async getNonProjectWorkspaceMembers(projectId: string, workspaceId: string) {
		return db
			.select()
			.from(workspaceMember)
			.leftJoin(
				projectMember,
				and(
					eq(workspaceMember.userId, projectMember.userId),
					eq(projectMember.projectId, projectId),
				),
			)
			.where(
				and(
					eq(workspaceMember.workspaceId, workspaceId),
					isNull(projectMember.userId),
				),
			);
	}

	async addMember(projectId: string, workspaceId: string, userId: string) {
		await db
			.insert(projectMember)
			.values({
				projectId,
				workspaceId,
				userId,
			})
			.onConflictDoNothing();
	}

	async removeMember(projectId: string, userId: string) {
		await db
			.delete(projectMember)
			.where(
				and(
					eq(projectMember.projectId, projectId),
					eq(projectMember.userId, userId),
				),
			);
	}

	async getMembers(projectId: string) {
		return db
			.select({
				userId: projectMember.userId,
				joinedAt: projectMember.joinedAt,
				userName: user.name,
				userEmail: user.email,
			})
			.from(projectMember)
			.where(eq(projectMember.projectId, projectId))
			.leftJoin(user, eq(projectMember.userId, user.id));
	}
}

export const projectService = new Project();
export default Project;
