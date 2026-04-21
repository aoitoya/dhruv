import { faker } from "@faker-js/faker";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, test } from "vitest";
import { buildApp } from "../src/app";
import { db } from "../src/db";
import {
	comment,
	project,
	task,
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

async function createTask(projectId: string, userCookies: Cookies) {
	const res = await app.inject({
		method: "POST",
		url: `/api/projects/${projectId}/tasks`,
		body: { title: faker.word.noun() },
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
		await db.delete(comment).where(eq(comment.taskId, p.id));
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

describe("Comment:", () => {
	let ownerCookies: Cookies;

	beforeAll(async () => {
		await app.ready();
		const { cookies } = await createUser();
		ownerCookies = cookies;
	});

	test("project member can create comment", async () => {
		const workspace = await createWorkspace(ownerCookies);
		const projectData = await createProject(workspace.id, ownerCookies);
		const taskData = await createTask(projectData.id, ownerCookies);

		const res = await app.inject({
			method: "POST",
			url: `/api/tasks/${taskData.id}/comments`,
			body: { content: "Test comment" },
			cookies: ownerCookies,
		});

		expect(res.statusCode).toBe(200);
		const body = JSON.parse(res.body);
		expect(body.success).toBe(true);
		expect(body.data.content).toBe("Test comment");

		await db.delete(comment).where(eq(comment.id, body.data.id));
		await db.delete(task).where(eq(task.id, taskData.id));
		await cleanupWorkspace(workspace.id);
	});

	test("non-member cannot create comment", async () => {
		const workspace = await createWorkspace(ownerCookies);
		const projectData = await createProject(workspace.id, ownerCookies);
		const taskData = await createTask(projectData.id, ownerCookies);
		const { user: otherUser, cookies: otherCookies } = await createUser();

		const res = await app.inject({
			method: "POST",
			url: `/api/tasks/${taskData.id}/comments`,
			body: { content: "Test comment" },
			cookies: otherCookies,
		});

		expect(res.statusCode).toBe(403);

		await db.delete(task).where(eq(task.id, taskData.id));
		await cleanupWorkspace(workspace.id);
		await cleanupUser(otherUser.id);
	});

	test("project member can get task comments", async () => {
		const workspace = await createWorkspace(ownerCookies);
		const projectData = await createProject(workspace.id, ownerCookies);
		const taskData = await createTask(projectData.id, ownerCookies);

		await app.inject({
			method: "POST",
			url: `/api/tasks/${taskData.id}/comments`,
			body: { content: "Comment 1" },
			cookies: ownerCookies,
		});
		await app.inject({
			method: "POST",
			url: `/api/tasks/${taskData.id}/comments`,
			body: { content: "Comment 2" },
			cookies: ownerCookies,
		});

		const res = await app.inject({
			method: "GET",
			url: `/api/tasks/${taskData.id}/comments`,
			cookies: ownerCookies,
		});

		expect(res.statusCode).toBe(200);
		const body = JSON.parse(res.body);
		expect(body.success).toBe(true);
		expect(body.data.length).toBe(2);

		await db.delete(comment).where(eq(comment.taskId, taskData.id));
		await db.delete(task).where(eq(task.id, taskData.id));
		await cleanupWorkspace(workspace.id);
	});

	test("author can update their own comment", async () => {
		const workspace = await createWorkspace(ownerCookies);
		const projectData = await createProject(workspace.id, ownerCookies);
		const taskData = await createTask(projectData.id, ownerCookies);

		const createRes = await app.inject({
			method: "POST",
			url: `/api/tasks/${taskData.id}/comments`,
			body: { content: "Original content" },
			cookies: ownerCookies,
		});
		const created = JSON.parse(createRes.body);
		const commentId = created.data.id;

		const res = await app.inject({
			method: "PATCH",
			url: `/api/comments/${commentId}`,
			body: { content: "Updated content" },
			cookies: ownerCookies,
		});

		expect(res.statusCode).toBe(200);
		const body = JSON.parse(res.body);
		expect(body.data.content).toBe("Updated content");

		await db.delete(comment).where(eq(comment.id, commentId));
		await db.delete(task).where(eq(task.id, taskData.id));
		await cleanupWorkspace(workspace.id);
	});

	test("non-author cannot update comment", async () => {
		const workspace = await createWorkspace(ownerCookies);
		const projectData = await createProject(workspace.id, ownerCookies);
		const taskData = await createTask(projectData.id, ownerCookies);
		const { user: otherUser, cookies: otherCookies } = await createUser();

		const createRes = await app.inject({
			method: "POST",
			url: `/api/tasks/${taskData.id}/comments`,
			body: { content: "Original content" },
			cookies: ownerCookies,
		});
		const created = JSON.parse(createRes.body);
		const commentId = created.data.id;

		const res = await app.inject({
			method: "PATCH",
			url: `/api/comments/${commentId}`,
			body: { content: "Updated content" },
			cookies: otherCookies,
		});

		expect(res.statusCode).toBe(403);

		await db.delete(comment).where(eq(comment.id, commentId));
		await db.delete(task).where(eq(task.id, taskData.id));
		await cleanupWorkspace(workspace.id);
		await cleanupUser(otherUser.id);
	});

	test("author can delete their own comment", async () => {
		const workspace = await createWorkspace(ownerCookies);
		const projectData = await createProject(workspace.id, ownerCookies);
		const taskData = await createTask(projectData.id, ownerCookies);

		const createRes = await app.inject({
			method: "POST",
			url: `/api/tasks/${taskData.id}/comments`,
			body: { content: "To delete" },
			cookies: ownerCookies,
		});
		const created = JSON.parse(createRes.body);
		const commentId = created.data.id;

		const res = await app.inject({
			method: "DELETE",
			url: `/api/comments/${commentId}`,
			cookies: ownerCookies,
		});

		expect(res.statusCode).toBe(200);

		const verifyRes = await app.inject({
			method: "GET",
			url: `/api/tasks/${taskData.id}/comments`,
			cookies: ownerCookies,
		});
		const body = JSON.parse(verifyRes.body);
		expect(body.data.length).toBe(0);

		await db.delete(task).where(eq(task.id, taskData.id));
		await cleanupWorkspace(workspace.id);
	});

	test("non-author cannot delete comment", async () => {
		const workspace = await createWorkspace(ownerCookies);
		const projectData = await createProject(workspace.id, ownerCookies);
		const taskData = await createTask(projectData.id, ownerCookies);
		const { user: otherUser, cookies: otherCookies } = await createUser();

		const createRes = await app.inject({
			method: "POST",
			url: `/api/tasks/${taskData.id}/comments`,
			body: { content: "To delete" },
			cookies: ownerCookies,
		});
		const created = JSON.parse(createRes.body);
		const commentId = created.data.id;

		const res = await app.inject({
			method: "DELETE",
			url: `/api/comments/${commentId}`,
			cookies: otherCookies,
		});

		expect(res.statusCode).toBe(403);

		await db.delete(comment).where(eq(comment.id, commentId));
		await db.delete(task).where(eq(task.id, taskData.id));
		await cleanupWorkspace(workspace.id);
		await cleanupUser(otherUser.id);
	});
});
