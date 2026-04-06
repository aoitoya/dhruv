import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
	user,
	workspace,
	workspaceInvite,
	workspaceMember,
} from "../../db/schema/index.js";

class Workspace {
	async create(name: string, ownerId: string) {
		return await db.transaction(async (tx) => {
			const [newWorkspace] = await tx
				.insert(workspace)
				.values({
					name,
				})
				.returning();

			if (!newWorkspace) {
				tx.rollback();
				throw new Error("Could not create workspace");
			}

			await tx.insert(workspaceMember).values({
				userId: ownerId,
				workspaceId: newWorkspace.id,
				role: "OWNER",
			});

			return newWorkspace;
		});
	}

	async getAll(userId: string) {
		const workspaces = await db
			.select({
				id: workspace.id,
				name: workspace.name,
				joinedAt: workspaceMember.createdAt,
				role: workspaceMember.role,
			})
			.from(workspaceMember)
			.where(
				and(
					eq(workspaceMember.userId, userId),
					eq(workspaceMember.status, "ACTIVE"),
				),
			)
			.leftJoin(workspace, eq(workspaceMember.workspaceId, workspace.id));

		return workspaces;
	}

	async getOneById(workspaceId: string) {
		const [workspaceDetails] = await db
			.select({
				id: workspace.id,
				name: workspace.name,
				joinedAt: workspaceMember.createdAt,
				role: workspaceMember.role,
			})
			.from(workspace)
			.where(eq(workspace.id, workspaceId))
			.leftJoin(workspaceMember, eq(workspace.id, workspaceMember.workspaceId))
			.limit(1);

		return workspaceDetails;
	}

	async updateOne(workspaceId: string, update: { name: string }) {
		const [updatedWorkspace] = await db
			.update(workspace)
			.set(update)
			.where(eq(workspace.id, workspaceId))
			.returning();

		if (!updatedWorkspace) {
			throw new Error();
		}
	}

	async deleteOne(workspaceId: string) {
		await db.delete(workspace).where(eq(workspace.id, workspaceId));
	}

	async inviteMembers(workspaceId: string, userIds: string[]) {
		await db.insert(workspaceInvite).values(
			userIds.map((userId) => ({
				userId,
				workspaceId,
			})),
		);
	}

	async responseWorkspaceInvite(
		workspaceId: string,
		userId: string,
		action: "accept" | "reject",
	) {
		await db.transaction(async (tx) => {
			const [invitation] = await tx
				.update(workspaceInvite)
				.set({
					status: action === "accept" ? "ACCEPTED" : "REJECTED",
				})
				.where(
					and(
						eq(workspaceInvite.workspaceId, workspaceId),
						eq(workspaceInvite.userId, userId),
						eq(workspaceInvite.status, "PENDING"),
					),
				)
				.returning();

			if (!invitation) {
				throw new Error("Invitation not found or already processed");
			}

			if (action === "reject") return;

			await tx.insert(workspaceMember).values({
				workspaceId,
				userId,
				role: "MEMBER",
			});
		});
	}

	async isActiveMember(workspaceId: string, userId: string) {
		const [result] = await db
			.select({})
			.from(workspaceMember)
			.where(
				and(
					eq(workspaceMember.workspaceId, workspaceId),
					eq(workspaceMember.userId, userId),
					eq(workspaceMember.status, "ACTIVE"),
				),
			);

		return !!result;
	}

	async isOwner(workspaceId: string, userId: string) {
		const [result] = await db
			.select({})
			.from(workspaceMember)
			.where(
				and(
					eq(workspaceMember.workspaceId, workspaceId),
					eq(workspaceMember.userId, userId),
					eq(workspaceMember.role, "OWNER"),
				),
			);

		return !!result;
	}

	async isAdminOrOwner(workspaceId: string, userId: string) {
		const [result] = await db
			.select({ role: workspaceMember.role })
			.from(workspaceMember)
			.where(
				and(
					eq(workspaceMember.workspaceId, workspaceId),
					eq(workspaceMember.userId, userId),
					eq(workspaceMember.status, "ACTIVE"),
				),
			);

		return !!result && (result.role === "OWNER" || result.role === "ADMIN");
	}

	async getMemberRole(workspaceId: string, userId: string) {
		const [result] = await db
			.select({ role: workspaceMember.role })
			.from(workspaceMember)
			.where(
				and(
					eq(workspaceMember.workspaceId, workspaceId),
					eq(workspaceMember.userId, userId),
					eq(workspaceMember.status, "ACTIVE"),
				),
			);

		return result?.role ?? null;
	}

	async getInvitesForWorkspace(workspaceId: string) {
		return db
			.select({
				workspaceId: workspaceInvite.workspaceId,
				userId: workspaceInvite.userId,
				status: workspaceInvite.status,
				createdAt: workspaceInvite.createdAt,
				userName: user.name,
				userEmail: user.email,
			})
			.from(workspaceInvite)
			.where(eq(workspaceInvite.workspaceId, workspaceId))
			.leftJoin(user, eq(workspaceInvite.userId, user.id));
	}

	async getInvitesForUser(userId: string) {
		return db
			.select({
				workspaceId: workspaceInvite.workspaceId,
				userId: workspaceInvite.userId,
				status: workspaceInvite.status,
				createdAt: workspaceInvite.createdAt,
				workspaceName: workspace.name,
			})
			.from(workspaceInvite)
			.where(
				and(
					eq(workspaceInvite.userId, userId),
					eq(workspaceInvite.status, "PENDING"),
				),
			)
			.leftJoin(workspace, eq(workspaceInvite.workspaceId, workspace.id));
	}

	async getMembers(workspaceId: string) {
		return db
			.select({
				userId: workspaceMember.userId,
				role: workspaceMember.role,
				status: workspaceMember.status,
				joinedAt: workspaceMember.createdAt,
				userName: user.name,
				userEmail: user.email,
			})
			.from(workspaceMember)
			.where(
				and(
					eq(workspaceMember.workspaceId, workspaceId),
					eq(workspaceMember.status, "ACTIVE"),
				),
			)
			.leftJoin(user, eq(workspaceMember.userId, user.id));
	}

	async removeMember(workspaceId: string, memberUserId: string) {
		await db
			.update(workspaceMember)
			.set({
				status: "REMOVED",
			})
			.where(
				and(
					eq(workspaceMember.workspaceId, workspaceId),
					eq(workspaceMember.userId, memberUserId),
				),
			);
	}

	async leaveWorkspace(workspaceId: string, userId: string) {
		const currentRole = await this.getMemberRole(workspaceId, userId);

		if (currentRole === "OWNER") {
			throw new Error("Owner must transfer ownership before leaving");
		}

		await db
			.update(workspaceMember)
			.set({
				status: "LEFT",
			})
			.where(
				and(
					eq(workspaceMember.workspaceId, workspaceId),
					eq(workspaceMember.userId, userId),
				),
			);
	}

	async transferOwnership(
		workspaceId: string,
		currentOwnerId: string,
		newOwnerId: string,
	) {
		await db.transaction(async (tx) => {
			await tx
				.update(workspaceMember)
				.set({ role: "ADMIN" })
				.where(
					and(
						eq(workspaceMember.workspaceId, workspaceId),
						eq(workspaceMember.userId, currentOwnerId),
					),
				);

			await tx
				.update(workspaceMember)
				.set({ role: "OWNER" })
				.where(
					and(
						eq(workspaceMember.workspaceId, workspaceId),
						eq(workspaceMember.userId, newOwnerId),
					),
				);
		});
	}

	async updateMemberRole(
		workspaceId: string,
		memberUserId: string,
		newRole: "ADMIN" | "MEMBER",
	) {
		const [updated] = await db
			.update(workspaceMember)
			.set({ role: newRole })
			.where(
				and(
					eq(workspaceMember.workspaceId, workspaceId),
					eq(workspaceMember.userId, memberUserId),
				),
			)
			.returning();

		return updated;
	}
}

export default Workspace;
