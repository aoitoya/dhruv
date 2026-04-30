import { faker } from "@faker-js/faker";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { buildApp } from "../src/app";
import { db } from "../src/db";
import {
	project,
	tag,
	task,
	taskTag,
	user,
	workspace,
	workspaceInvite,
	workspaceMember,
} from "../src/db/schema";

interface Cookies {
	[name: string]: string;
}

const app = buildApp();

async function createUser() {
	const res = await app.inject({
		method: "POST",
		url: "/api/auth/sign-up/email",
		body: {
			name: faker.person.fullName(),
			email: faker.internet.email(),
			password: faker.internet.password(),
		},
	});
	if (res.statusCode !== 200) {
		throw new Error(`Failed to create user: ${res.body}`);
	}
	const body = JSON.parse(res.body);
	if (!body.user) {
		throw new Error("Invalid response: missing user");
	}
	const cookies = Object.fromEntries(res.cookies.map((c) => [c.name, c.value]));
	return { user: body.user, cookies };
}

async function createWorkspace(userCookies: Cookies) {
	const res = await app.inject({
		method: "POST",
		url: "/api/workspaces",
		body: { name: faker.word.noun() },
		cookies: userCookies,
	});
	if (res.statusCode !== 200) {
		throw new Error(`Failed to create workspace: ${res.body}`);
	}
	const body = JSON.parse(res.body);
	if (!body.data) {
		throw new Error("Invalid response: missing data");
	}
	return body.data;
}

async function createProject(workspaceId: string, userCookies: Cookies) {
	const res = await app.inject({
		method: "POST",
		url: `/api/workspaces/${workspaceId}/projects`,
		body: { name: faker.word.noun() },
		cookies: userCookies,
	});
	if (res.statusCode !== 200) {
		throw new Error(`Failed to create project: ${res.body}`);
	}
	const body = JSON.parse(res.body);
	return body.data;
}

async function createTask(
	projectId: string,
	userCookies: Cookies,
	taskData: object,
) {
	const res = await app.inject({
		method: "POST",
		url: `/api/projects/${projectId}/tasks`,
		body: taskData,
		cookies: userCookies,
	});
	if (res.statusCode !== 200) {
		throw new Error(`Failed to create task: ${res.body}`);
	}
	const body = JSON.parse(res.body);
	return body.data;
}

async function cleanupWorkspace(workspaceId: string) {
	const projects = await db
		.select({ id: project.id })
		.from(project)
		.where(eq(project.workspaceId, workspaceId));
	for (const p of projects) {
		const tasks = await db
			.select({ id: task.id })
			.from(task)
			.where(eq(task.projectId, p.id));
		for (const t of tasks) {
			await db.delete(taskTag).where(eq(taskTag.taskId, t.id));
		}
		await db.delete(task).where(eq(task.projectId, p.id));
	}
	await db.delete(project).where(eq(project.workspaceId, workspaceId));
	await db.delete(workspace).where(eq(workspace.id, workspaceId));
}

async function cleanupUser(userId: string) {
	const [usr] = await db.select().from(user).where(eq(user.id, userId));
	await db.delete(workspaceMember).where(eq(workspaceMember.userId, userId));
	if (!usr) return;
	await db.delete(workspaceInvite).where(eq(workspaceInvite.email, usr.email));
	await db.delete(user).where(eq(user.id, userId));
}

describe("Tag:", () => {
	let ownerCookies: Cookies;
	let workspaceId: string;

	beforeAll(async () => {
		await app.ready();
		const { cookies } = await createUser();
		ownerCookies = cookies;
		const workspace = await createWorkspace(ownerCookies);
		workspaceId = workspace.id;
	});

	test("workspace admin can create tag", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/tags`,
			body: {
				name: "Bug",
				color: "#ef4444",
			},
			cookies: ownerCookies,
		});

		expect(res.statusCode).toBe(200);
		const body = JSON.parse(res.body);
		expect(body.success).toBe(true);
		expect(body.data.name).toBe("Bug");
		expect(body.data.color).toBe("#ef4444");

		await db.delete(tag).where(eq(tag.id, body.data.id));
	});

	test("workspace member can get workspace tags", async () => {
		const createRes = await app.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/tags`,
			body: { name: "Feature" },
			cookies: ownerCookies,
		});
		const created = JSON.parse(createRes.body);
		const tagId = created.data.id;

		const res = await app.inject({
			method: "GET",
			url: `/api/workspaces/${workspaceId}/tags`,
			cookies: ownerCookies,
		});

		expect(res.statusCode).toBe(200);
		const body = JSON.parse(res.body);
		expect(body.success).toBe(true);
		expect(Array.isArray(body.data)).toBe(true);
		expect(body.data.length).toBeGreaterThan(0);

		await db.delete(tag).where(eq(tag.id, tagId));
	});

	test("workspace admin can update tag", async () => {
		const createRes = await app.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/tags`,
			body: { name: "Original" },
			cookies: ownerCookies,
		});
		const created = JSON.parse(createRes.body);
		const tagId = created.data.id;

		const res = await app.inject({
			method: "PATCH",
			url: `/api/tags/${tagId}`,
			body: {
				name: "Updated",
				color: "#22c55e",
			},
			cookies: ownerCookies,
		});

		expect(res.statusCode).toBe(200);
		const body = JSON.parse(res.body);
		expect(body.data.name).toBe("Updated");
		expect(body.data.color).toBe("#22c55e");

		await db.delete(tag).where(eq(tag.id, tagId));
	});

	test("workspace admin can delete tag", async () => {
		const createRes = await app.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/tags`,
			body: { name: "To Delete" },
			cookies: ownerCookies,
		});
		const created = JSON.parse(createRes.body);
		const tagId = created.data.id;

		const res = await app.inject({
			method: "DELETE",
			url: `/api/tags/${tagId}`,
			cookies: ownerCookies,
		});

		expect(res.statusCode).toBe(200);

		const verifyRes = await app.inject({
			method: "GET",
			url: `/api/workspaces/${workspaceId}/tags`,
			cookies: ownerCookies,
		});
		const verifyBody = JSON.parse(verifyRes.body);
		expect(
			verifyBody.data.find((t: typeof tag.$inferSelect) => t.id === tagId),
		).toBeUndefined();
	});

	test("non-admin cannot create tag", async () => {
		const { user: otherUser, cookies: otherCookies } = await createUser();

		const res = await app.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/tags`,
			body: { name: "Should Fail" },
			cookies: otherCookies,
		});

		expect(res.statusCode).toBe(403);

		await cleanupUser(otherUser.id);
	});

	test("non-admin cannot update tag", async () => {
		const createRes = await app.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/tags`,
			body: { name: "Test Tag" },
			cookies: ownerCookies,
		});
		const created = JSON.parse(createRes.body);
		const tagId = created.data.id;

		const { user: otherUser, cookies: otherCookies } = await createUser();

		const res = await app.inject({
			method: "PATCH",
			url: `/api/tags/${tagId}`,
			body: { name: "Should Fail" },
			cookies: otherCookies,
		});

		expect(res.statusCode).toBe(403);

		await db.delete(tag).where(eq(tag.id, tagId));
		await cleanupUser(otherUser.id);
	});

	test("non-admin cannot delete tag", async () => {
		const createRes = await app.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/tags`,
			body: { name: "Delete Test" },
			cookies: ownerCookies,
		});
		const created = JSON.parse(createRes.body);
		const tagId = created.data.id;

		const { user: otherUser, cookies: otherCookies } = await createUser();

		const res = await app.inject({
			method: "DELETE",
			url: `/api/tags/${tagId}`,
			cookies: otherCookies,
		});

		expect(res.statusCode).toBe(403);

		await db.delete(tag).where(eq(tag.id, tagId));
		await cleanupUser(otherUser.id);
	});

	test("tag name must be unique per workspace", async () => {
		await app.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/tags`,
			body: { name: "Duplicate" },
			cookies: ownerCookies,
		});

		const res = await app.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/tags`,
			body: { name: "Duplicate" },
			cookies: ownerCookies,
		});

		expect(res.statusCode).toBe(400);

		const tags = await db.select().from(tag).where(eq(tag.name, "Duplicate"));
		for (const t of tags) {
			await db.delete(tag).where(eq(tag.id, t.id));
		}
	});
});

describe("Task-Tag Association:", () => {
	let ownerCookies: Cookies;
	let workspaceId: string;
	let projectId: string;
	let taskId: string;

	beforeAll(async () => {
		await app.ready();
		const { cookies } = await createUser();
		ownerCookies = cookies;
		const workspace = await createWorkspace(ownerCookies);
		workspaceId = workspace.id;
		const projectData = await createProject(workspaceId, ownerCookies);
		projectId = projectData.id;
		const taskData = await createTask(projectId, ownerCookies, {
			title: "Test Task",
		});
		taskId = taskData.id;
	});

	test("can add tags to task", async () => {
		const tagRes = await app.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/tags`,
			body: { name: "Task Tag" },
			cookies: ownerCookies,
		});
		const tagData = JSON.parse(tagRes.body);
		const tagId = tagData.data.id;

		const res = await app.inject({
			method: "POST",
			url: `/api/tasks/${taskId}/tags`,
			body: { tagIds: [tagId] },
			cookies: ownerCookies,
		});

		expect(res.statusCode).toBe(200);

		await db.delete(taskTag).where(eq(taskTag.taskId, taskId));
		await db.delete(tag).where(eq(tag.id, tagId));
	});

	test("can get tags for task", async () => {
		const tagRes = await app.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/tags`,
			body: { name: "Get Test Tag" },
			cookies: ownerCookies,
		});
		const tagData = JSON.parse(tagRes.body);
		const tagId = tagData.data.id;

		await app.inject({
			method: "POST",
			url: `/api/tasks/${taskId}/tags`,
			body: { tagIds: [tagId] },
			cookies: ownerCookies,
		});

		const res = await app.inject({
			method: "GET",
			url: `/api/tasks/${taskId}/tags`,
			cookies: ownerCookies,
		});

		expect(res.statusCode).toBe(200);
		const body = JSON.parse(res.body);
		expect(body.success).toBe(true);

		await db.delete(taskTag).where(eq(taskTag.taskId, taskId));
		await db.delete(tag).where(eq(tag.id, tagId));
	});

	test("can remove tag from task", async () => {
		const tagRes = await app.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/tags`,
			body: { name: "Remove Test Tag" },
			cookies: ownerCookies,
		});
		const tagData = JSON.parse(tagRes.body);
		const tagId = tagData.data.id;

		await app.inject({
			method: "POST",
			url: `/api/tasks/${taskId}/tags`,
			body: { tagIds: [tagId] },
			cookies: ownerCookies,
		});

		const res = await app.inject({
			method: "DELETE",
			url: `/api/tasks/${taskId}/tags/${tagId}`,
			cookies: ownerCookies,
		});

		expect(res.statusCode).toBe(200);

		await db.delete(tag).where(eq(tag.id, tagId));
	});

	test("deleting tag removes task associations", async () => {
		const tagRes = await app.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceId}/tags`,
			body: { name: "Cascade Test Tag" },
			cookies: ownerCookies,
		});
		const tagData = JSON.parse(tagRes.body);
		const tagId = tagData.data.id;

		await app.inject({
			method: "POST",
			url: `/api/tasks/${taskId}/tags`,
			body: { tagIds: [tagId] },
			cookies: ownerCookies,
		});

		await app.inject({
			method: "DELETE",
			url: `/api/tags/${tagId}`,
			cookies: ownerCookies,
		});

		const associations = await db
			.select()
			.from(taskTag)
			.where(eq(taskTag.tagId, tagId));
		expect(associations.length).toBe(0);
	});

	afterAll(async () => {
		await db.delete(task).where(eq(task.id, taskId));
		await db.delete(project).where(eq(project.id, projectId));
		await db.delete(workspace).where(eq(workspace.id, workspaceId));
	});
});
