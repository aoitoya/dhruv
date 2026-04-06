import { faker } from "@faker-js/faker";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, test } from "vitest";
import { buildApp } from "../src/app";
import { db } from "../src/db";
import {
	project,
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

async function cleanupWorkspace(workspaceId: string) {
	await db.delete(project).where(eq(project.workspaceId, workspaceId));
	await db.delete(workspace).where(eq(workspace.id, workspaceId));
}

async function cleanupUser(userId: string) {
	await db.delete(workspaceInvite).where(eq(workspaceInvite.userId, userId));
	await db.delete(workspaceMember).where(eq(workspaceMember.userId, userId));
	await db.delete(user).where(eq(user.id, userId));
}

describe("Project:", () => {
	let ownerCookies: Cookies;

	beforeAll(async () => {
		await app.ready();
		const { cookies } = await createUser();
		ownerCookies = cookies;
	});

	test("owner can create project", async () => {
		const workspace = await createWorkspace(ownerCookies);

		const res = await app.inject({
			method: "POST",
			url: `/api/workspaces/${workspace.id}/projects`,
			body: {
				name: "Test Project",
				description: "A test project",
				color: "#ff0000",
			},
			cookies: ownerCookies,
		});

		expect(res.statusCode).toBe(200);
		const body = JSON.parse(res.body);
		expect(body.success).toBe(true);
		expect(body.data).toBeDefined();
		expect(body.data.name).toBe("Test Project");

		await cleanupWorkspace(workspace.id);
	});

	test("member cannot create project", async () => {
		const workspace = await createWorkspace(ownerCookies);
		const { user: memberUser, cookies: memberCookies } = await createUser();

		await app.inject({
			method: "POST",
			url: `/api/workspaces/${workspace.id}/invite`,
			body: { userIds: [memberUser.id] },
			cookies: ownerCookies,
		});
		await app.inject({
			method: "POST",
			url: `/api/invites/${workspace.id}/response`,
			body: { action: "accept" },
			cookies: memberCookies,
		});

		const res = await app.inject({
			method: "POST",
			url: `/api/workspaces/${workspace.id}/projects`,
			body: { name: "Test Project" },
			cookies: memberCookies,
		});

		expect(res.statusCode).toBe(403);

		await cleanupWorkspace(workspace.id);
		await cleanupUser(memberUser.id);
	});

	test("user can get workspace projects they are member of", async () => {
		const workspace = await createWorkspace(ownerCookies);

		await app.inject({
			method: "POST",
			url: `/api/workspaces/${workspace.id}/projects`,
			body: { name: "Project 1" },
			cookies: ownerCookies,
		});

		const res = await app.inject({
			method: "GET",
			url: `/api/workspaces/${workspace.id}/projects`,
			cookies: ownerCookies,
		});

		expect(res.statusCode).toBe(200);
		const body = JSON.parse(res.body);
		expect(body.success).toBe(true);
		expect(Array.isArray(body.data)).toBe(true);
		expect(body.data.length).toBeGreaterThan(0);

		await cleanupWorkspace(workspace.id);
	});

	test("project member can get project details", async () => {
		const workspace = await createWorkspace(ownerCookies);

		const createRes = await app.inject({
			method: "POST",
			url: `/api/workspaces/${workspace.id}/projects`,
			body: { name: "Test Project" },
			cookies: ownerCookies,
		});
		const created = JSON.parse(createRes.body);
		const projectId = created.data.id;

		const res = await app.inject({
			method: "GET",
			url: `/api/projects/${projectId}`,
			cookies: ownerCookies,
		});

		expect(res.statusCode).toBe(200);
		const body = JSON.parse(res.body);
		expect(body.success).toBe(true);
		expect(body.data.id).toBe(projectId);

		await cleanupWorkspace(workspace.id);
	});

	test("non-member cannot get project details", async () => {
		const workspace = await createWorkspace(ownerCookies);
		const { user: otherUser, cookies: otherCookies } = await createUser();

		const createRes = await app.inject({
			method: "POST",
			url: `/api/workspaces/${workspace.id}/projects`,
			body: { name: "Test Project" },
			cookies: ownerCookies,
		});
		const created = JSON.parse(createRes.body);
		const projectId = created.data.id;

		const res = await app.inject({
			method: "GET",
			url: `/api/projects/${projectId}`,
			cookies: otherCookies,
		});

		expect(res.statusCode).toBe(403);

		await cleanupWorkspace(workspace.id);
		await cleanupUser(otherUser.id);
	});

	test("owner can update project", async () => {
		const workspace = await createWorkspace(ownerCookies);

		const createRes = await app.inject({
			method: "POST",
			url: `/api/workspaces/${workspace.id}/projects`,
			body: { name: "Test Project" },
			cookies: ownerCookies,
		});
		const created = JSON.parse(createRes.body);
		const projectId = created.data.id;

		const res = await app.inject({
			method: "PATCH",
			url: `/api/projects/${projectId}`,
			body: {
				name: "Updated Project",
				status: "ARCHIVED",
			},
			cookies: ownerCookies,
		});

		expect(res.statusCode).toBe(200);

		await cleanupWorkspace(workspace.id);
	});

	test("owner can delete project", async () => {
		const workspace = await createWorkspace(ownerCookies);

		const createRes = await app.inject({
			method: "POST",
			url: `/api/workspaces/${workspace.id}/projects`,
			body: { name: "Test Project" },
			cookies: ownerCookies,
		});
		const created = JSON.parse(createRes.body);
		const projectId = created.data.id;

		const res = await app.inject({
			method: "DELETE",
			url: `/api/projects/${projectId}`,
			cookies: ownerCookies,
		});

		expect(res.statusCode).toBe(200);

		await cleanupWorkspace(workspace.id);
	});

	test("owner can add members to project", async () => {
		const workspace = await createWorkspace(ownerCookies);
		const { user: memberUser, cookies: memberCookies } = await createUser();

		await app.inject({
			method: "POST",
			url: `/api/workspaces/${workspace.id}/invite`,
			body: { userIds: [memberUser.id] },
			cookies: ownerCookies,
		});
		await app.inject({
			method: "POST",
			url: `/api/invites/${workspace.id}/response`,
			body: { action: "accept" },
			cookies: memberCookies,
		});

		const createRes = await app.inject({
			method: "POST",
			url: `/api/workspaces/${workspace.id}/projects`,
			body: { name: "Test Project" },
			cookies: ownerCookies,
		});
		const created = JSON.parse(createRes.body);
		const projectId = created.data.id;

		const res = await app.inject({
			method: "POST",
			url: `/api/projects/${projectId}/members`,
			body: { userIds: [memberUser.id] },
			cookies: ownerCookies,
		});

		expect(res.statusCode).toBe(200);

		await cleanupWorkspace(workspace.id);
		await cleanupUser(memberUser.id);
	});

	test("owner can remove member from project", async () => {
		const workspace = await createWorkspace(ownerCookies);
		const { user: memberUser, cookies: memberCookies } = await createUser();

		await app.inject({
			method: "POST",
			url: `/api/workspaces/${workspace.id}/invite`,
			body: { userIds: [memberUser.id] },
			cookies: ownerCookies,
		});
		await app.inject({
			method: "POST",
			url: `/api/invites/${workspace.id}/response`,
			body: { action: "accept" },
			cookies: memberCookies,
		});

		const createRes = await app.inject({
			method: "POST",
			url: `/api/workspaces/${workspace.id}/projects`,
			body: { name: "Test Project" },
			cookies: ownerCookies,
		});
		const created = JSON.parse(createRes.body);
		const projectId = created.data.id;

		await app.inject({
			method: "POST",
			url: `/api/projects/${projectId}/members`,
			body: { userIds: [memberUser.id] },
			cookies: ownerCookies,
		});

		const res = await app.inject({
			method: "DELETE",
			url: `/api/projects/${projectId}/members/${memberUser.id}`,
			cookies: ownerCookies,
		});

		expect(res.statusCode).toBe(200);

		await cleanupWorkspace(workspace.id);
		await cleanupUser(memberUser.id);
	});

	test("user can get project members", async () => {
		const workspace = await createWorkspace(ownerCookies);

		const createRes = await app.inject({
			method: "POST",
			url: `/api/workspaces/${workspace.id}/projects`,
			body: { name: "Test Project" },
			cookies: ownerCookies,
		});
		const created = JSON.parse(createRes.body);
		const projectId = created.data.id;

		const res = await app.inject({
			method: "GET",
			url: `/api/projects/${projectId}/members`,
			cookies: ownerCookies,
		});

		expect(res.statusCode).toBe(200);
		const body = JSON.parse(res.body);
		expect(body.success).toBe(true);
		expect(Array.isArray(body.data)).toBe(true);

		await cleanupWorkspace(workspace.id);
	});
});
