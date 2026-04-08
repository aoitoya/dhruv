import { faker } from "@faker-js/faker";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, test } from "vitest";
import { buildApp } from "../src/app";
import { db } from "../src/db";
import {
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

async function cleanupWorkspace(workspaceId: string) {
	const projects = await db
		.select({ id: project.id })
		.from(project)
		.where(eq(project.workspaceId, workspaceId));
	for (const p of projects) {
		await db.delete(task).where(eq(task.projectId, p.id));
	}
	await db.delete(project).where(eq(project.workspaceId, workspaceId));
	await db.delete(workspace).where(eq(workspace.id, workspaceId));
}

async function cleanupUser(userId: string) {
	await db.delete(workspaceInvite).where(eq(workspaceInvite.userId, userId));
	await db.delete(workspaceMember).where(eq(workspaceMember.userId, userId));
	await db.delete(user).where(eq(user.id, userId));
}

describe("Task:", () => {
	let ownerCookies: Cookies;

	beforeAll(async () => {
		await app.ready();
		const { cookies } = await createUser();
		ownerCookies = cookies;
	});

	test("project member can create task", async () => {
		const workspace = await createWorkspace(ownerCookies);
		const projectData = await createProject(workspace.id, ownerCookies);

		const res = await app.inject({
			method: "POST",
			url: `/api/projects/${projectData.id}/tasks`,
			body: {
				title: "Test Task",
				description: "A test task",
			},
			cookies: ownerCookies,
		});

		expect(res.statusCode).toBe(200);
		const body = JSON.parse(res.body);
		expect(body.success).toBe(true);
		expect(body.data).toBeDefined();
		expect(body.data.title).toBe("Test Task");
		expect(body.data.status).toBe("TODO");
		expect(body.data.position).toBe(1000);

		await db.delete(task).where(eq(task.id, body.data.id));
		await cleanupWorkspace(workspace.id);
	});

	test("project member can create task with status and priority", async () => {
		const workspace = await createWorkspace(ownerCookies);
		const projectData = await createProject(workspace.id, ownerCookies);

		const res = await app.inject({
			method: "POST",
			url: `/api/projects/${projectData.id}/tasks`,
			body: {
				title: "Priority Task",
				status: "IN_PROGRESS",
				priority: "HIGH",
			},
			cookies: ownerCookies,
		});

		expect(res.statusCode).toBe(200);
		const body = JSON.parse(res.body);
		expect(body.data.status).toBe("IN_PROGRESS");
		expect(body.data.priority).toBe("HIGH");

		await db.delete(task).where(eq(task.id, body.data.id));
		await cleanupWorkspace(workspace.id);
	});

	test("non-member cannot create task", async () => {
		const workspace = await createWorkspace(ownerCookies);
		const projectData = await createProject(workspace.id, ownerCookies);
		const { user: otherUser, cookies: otherCookies } = await createUser();

		const res = await app.inject({
			method: "POST",
			url: `/api/projects/${projectData.id}/tasks`,
			body: { title: "Test Task" },
			cookies: otherCookies,
		});

		expect(res.statusCode).toBe(403);

		await db.delete(task).where(eq(task.projectId, projectData.id));
		await cleanupWorkspace(workspace.id);
		await cleanupUser(otherUser.id);
	});

	test("project member can get project tasks", async () => {
		const workspace = await createWorkspace(ownerCookies);
		const projectData = await createProject(workspace.id, ownerCookies);

		await app.inject({
			method: "POST",
			url: `/api/projects/${projectData.id}/tasks`,
			body: { title: "Task 1" },
			cookies: ownerCookies,
		});
		await app.inject({
			method: "POST",
			url: `/api/projects/${projectData.id}/tasks`,
			body: { title: "Task 2" },
			cookies: ownerCookies,
		});

		const res = await app.inject({
			method: "GET",
			url: `/api/projects/${projectData.id}/tasks`,
			cookies: ownerCookies,
		});

		expect(res.statusCode).toBe(200);
		const body = JSON.parse(res.body);
		expect(body.success).toBe(true);
		expect(Array.isArray(body.data)).toBe(true);
		expect(body.data.length).toBe(2);

		await cleanupWorkspace(workspace.id);
	});

	test("project member can get single task", async () => {
		const workspace = await createWorkspace(ownerCookies);
		const projectData = await createProject(workspace.id, ownerCookies);

		const createRes = await app.inject({
			method: "POST",
			url: `/api/projects/${projectData.id}/tasks`,
			body: { title: "Single Task" },
			cookies: ownerCookies,
		});
		const created = JSON.parse(createRes.body);
		const taskId = created.data.id;

		const res = await app.inject({
			method: "GET",
			url: `/api/tasks/${taskId}`,
			cookies: ownerCookies,
		});

		expect(res.statusCode).toBe(200);
		const body = JSON.parse(res.body);
		expect(body.success).toBe(true);
		expect(body.data.id).toBe(taskId);
		expect(body.data.title).toBe("Single Task");

		await db.delete(task).where(eq(task.id, taskId));
		await cleanupWorkspace(workspace.id);
	});

	test("non-member cannot get task", async () => {
		const workspace = await createWorkspace(ownerCookies);
		const projectData = await createProject(workspace.id, ownerCookies);
		const { user: otherUser, cookies: otherCookies } = await createUser();

		const createRes = await app.inject({
			method: "POST",
			url: `/api/projects/${projectData.id}/tasks`,
			body: { title: "Test Task" },
			cookies: ownerCookies,
		});
		const created = JSON.parse(createRes.body);
		const taskId = created.data.id;

		const res = await app.inject({
			method: "GET",
			url: `/api/tasks/${taskId}`,
			cookies: otherCookies,
		});

		expect(res.statusCode).toBe(403);

		await db.delete(task).where(eq(task.id, taskId));
		await cleanupWorkspace(workspace.id);
		await cleanupUser(otherUser.id);
	});

	test("project member can update task", async () => {
		const workspace = await createWorkspace(ownerCookies);
		const projectData = await createProject(workspace.id, ownerCookies);

		const createRes = await app.inject({
			method: "POST",
			url: `/api/projects/${projectData.id}/tasks`,
			body: { title: "Original Title" },
			cookies: ownerCookies,
		});
		const created = JSON.parse(createRes.body);
		const taskId = created.data.id;

		const res = await app.inject({
			method: "PATCH",
			url: `/api/tasks/${taskId}`,
			body: {
				title: "Updated Title",
				status: "DONE",
			},
			cookies: ownerCookies,
		});

		expect(res.statusCode).toBe(200);
		const body = JSON.parse(res.body);
		expect(body.data.title).toBe("Updated Title");
		expect(body.data.status).toBe("DONE");

		await db.delete(task).where(eq(task.id, taskId));
		await cleanupWorkspace(workspace.id);
	});

	test("update task rejects unknown fields", async () => {
		const workspace = await createWorkspace(ownerCookies);
		const projectData = await createProject(workspace.id, ownerCookies);

		const createRes = await app.inject({
			method: "POST",
			url: `/api/projects/${projectData.id}/tasks`,
			body: { title: "Test Task" },
			cookies: ownerCookies,
		});
		const created = JSON.parse(createRes.body);
		const taskId = created.data.id;

		const res = await app.inject({
			method: "PATCH",
			url: `/api/tasks/${taskId}`,
			body: {
				unknownField: "should fail",
			},
			cookies: ownerCookies,
		});

		expect(res.statusCode).toBe(400);

		await db.delete(task).where(eq(task.id, taskId));
		await cleanupWorkspace(workspace.id);
	});

	test("update task rejects empty body", async () => {
		const workspace = await createWorkspace(ownerCookies);
		const projectData = await createProject(workspace.id, ownerCookies);

		const createRes = await app.inject({
			method: "POST",
			url: `/api/projects/${projectData.id}/tasks`,
			body: { title: "Test Task" },
			cookies: ownerCookies,
		});
		const created = JSON.parse(createRes.body);
		const taskId = created.data.id;

		const res = await app.inject({
			method: "PATCH",
			url: `/api/tasks/${taskId}`,
			body: {},
			cookies: ownerCookies,
		});

		expect(res.statusCode).toBe(400);

		await db.delete(task).where(eq(task.id, taskId));
		await cleanupWorkspace(workspace.id);
	});

	test("project member can delete task", async () => {
		const workspace = await createWorkspace(ownerCookies);
		const projectData = await createProject(workspace.id, ownerCookies);

		const createRes = await app.inject({
			method: "POST",
			url: `/api/projects/${projectData.id}/tasks`,
			body: { title: "To Delete" },
			cookies: ownerCookies,
		});
		const created = JSON.parse(createRes.body);
		const taskId = created.data.id;

		const res = await app.inject({
			method: "DELETE",
			url: `/api/tasks/${taskId}`,
			cookies: ownerCookies,
		});

		expect(res.statusCode).toBe(200);

		const verifyRes = await app.inject({
			method: "GET",
			url: `/api/tasks/${taskId}`,
			cookies: ownerCookies,
		});
		expect(verifyRes.statusCode).toBe(404);

		await cleanupWorkspace(workspace.id);
	});

	test("create task assigns correct position", async () => {
		const workspace = await createWorkspace(ownerCookies);
		const projectData = await createProject(workspace.id, ownerCookies);

		const res1 = await app.inject({
			method: "POST",
			url: `/api/projects/${projectData.id}/tasks`,
			body: { title: "Task 1" },
			cookies: ownerCookies,
		});
		const body1 = JSON.parse(res1.body);
		expect(body1.data.position).toBe(1000);

		const res2 = await app.inject({
			method: "POST",
			url: `/api/projects/${projectData.id}/tasks`,
			body: { title: "Task 2" },
			cookies: ownerCookies,
		});
		const body2 = JSON.parse(res2.body);
		expect(body2.data.position).toBe(2000);

		await db.delete(task).where(eq(task.id, body1.data.id));
		await db.delete(task).where(eq(task.id, body2.data.id));
		await cleanupWorkspace(workspace.id);
	});

	test("create task with parentTaskId creates subtask", async () => {
		const workspace = await createWorkspace(ownerCookies);
		const projectData = await createProject(workspace.id, ownerCookies);

		const parentRes = await app.inject({
			method: "POST",
			url: `/api/projects/${projectData.id}/tasks`,
			body: { title: "Parent Task" },
			cookies: ownerCookies,
		});
		const parent = JSON.parse(parentRes.body);
		const parentId = parent.data.id;

		const subtaskRes = await app.inject({
			method: "POST",
			url: `/api/projects/${projectData.id}/tasks`,
			body: {
				title: "Subtask",
				parentTaskId: parentId,
			},
			cookies: ownerCookies,
		});

		expect(subtaskRes.statusCode).toBe(200);
		const subtaskBody = JSON.parse(subtaskRes.body);
		expect(subtaskBody.data.parentTaskId).toBe(parentId);

		await db.delete(task).where(eq(task.id, parentId));
		await db.delete(task).where(eq(task.id, subtaskBody.data.id));
		await cleanupWorkspace(workspace.id);
	});

	test("get subtasks returns child tasks", async () => {
		const workspace = await createWorkspace(ownerCookies);
		const projectData = await createProject(workspace.id, ownerCookies);

		const parentRes = await app.inject({
			method: "POST",
			url: `/api/projects/${projectData.id}/tasks`,
			body: { title: "Parent Task" },
			cookies: ownerCookies,
		});
		const parent = JSON.parse(parentRes.body);
		const parentId = parent.data.id;

		await app.inject({
			method: "POST",
			url: `/api/projects/${projectData.id}/tasks`,
			body: {
				title: "Subtask 1",
				parentTaskId: parentId,
			},
			cookies: ownerCookies,
		});

		const res = await app.inject({
			method: "GET",
			url: `/api/tasks/${parentId}/subtasks`,
			cookies: ownerCookies,
		});

		expect(res.statusCode).toBe(200);
		const body = JSON.parse(res.body);
		expect(body.success).toBe(true);
		expect(body.data.length).toBe(1);
		expect(body.data[0].title).toBe("Subtask 1");

		await db.delete(task).where(eq(task.id, parentId));
		await cleanupWorkspace(workspace.id);
	});

	test("project member can reorder task", async () => {
		const workspace = await createWorkspace(ownerCookies);
		const projectData = await createProject(workspace.id, ownerCookies);

		const task1 = await app.inject({
			method: "POST",
			url: `/api/projects/${projectData.id}/tasks`,
			body: { title: "Task 1" },
			cookies: ownerCookies,
		});
		const task1Data = JSON.parse(task1.body);

		const task2 = await app.inject({
			method: "POST",
			url: `/api/projects/${projectData.id}/tasks`,
			body: { title: "Task 2" },
			cookies: ownerCookies,
		});
		const task2Data = JSON.parse(task2.body);

		expect(task1Data.data.position).toBe(1000);
		expect(task2Data.data.position).toBe(2000);

		const res = await app.inject({
			method: "PATCH",
			url: `/api/tasks/${task1Data.data.id}/reorder`,
			body: { position: 5000 },
			cookies: ownerCookies,
		});

		expect(res.statusCode).toBe(200);
		const body = JSON.parse(res.body);
		expect(body.data.position).toBe(5000);

		await db.delete(task).where(eq(task.id, task1Data.data.id));
		await db.delete(task).where(eq(task.id, task2Data.data.id));
		await cleanupWorkspace(workspace.id);
	});

	test("non-member cannot reorder task", async () => {
		const workspace = await createWorkspace(ownerCookies);
		const projectData = await createProject(workspace.id, ownerCookies);
		const { user: otherUser, cookies: otherCookies } = await createUser();

		const taskRes = await app.inject({
			method: "POST",
			url: `/api/projects/${projectData.id}/tasks`,
			body: { title: "Test Task" },
			cookies: ownerCookies,
		});
		const taskData = JSON.parse(taskRes.body);

		const res = await app.inject({
			method: "PATCH",
			url: `/api/tasks/${taskData.data.id}/reorder`,
			body: { position: 5000 },
			cookies: otherCookies,
		});

		expect(res.statusCode).toBe(403);

		await db.delete(task).where(eq(task.id, taskData.data.id));
		await cleanupWorkspace(workspace.id);
		await cleanupUser(otherUser.id);
	});
});
