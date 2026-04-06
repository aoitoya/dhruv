import { faker } from "@faker-js/faker";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, test } from "vitest";
import { buildApp } from "../src/app";
import { db } from "../src/db";
import {
	user,
	workspace,
	workspaceInvite,
	workspaceMember,
} from "../src/db/schema";

interface Cookies {
	[name: string]: string;
}

type Workspace = typeof workspace.$inferSelect;
type WorkspaceInvite = typeof workspaceInvite.$inferInsert;

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
	await db.delete(workspace).where(eq(workspace.id, workspaceId));
}

async function cleanupUser(userId: string) {
	await db.delete(workspaceInvite).where(eq(workspaceInvite.userId, userId));
	await db.delete(workspaceMember).where(eq(workspaceMember.userId, userId));
	await db.delete(user).where(eq(user.id, userId));
}

describe("Workspace:", () => {
	let cookies: Cookies;

	beforeAll(async () => {
		await app.ready();
		const { cookies: newCookies } = await createUser();
		cookies = newCookies;
	});

	test("user can create workspace", async () => {
		const workspaceName = faker.word.noun();

		const res = await app.inject({
			method: "POST",
			url: "/api/workspaces",
			body: {
				name: workspaceName,
			},
			cookies,
		});

		expect(res.statusCode).toBe(200);
		const body = JSON.parse(res.body);
		expect(body.success).toBe(true);
		expect(body.data).toBeDefined();
		expect(body.data.id).toBeDefined();
		expect(body.data.name).toBe(workspaceName);

		await cleanupWorkspace(body.data.id);
	});

	test("user can fetch created workspace details", async () => {
		const workspace = await createWorkspace(cookies);

		const res = await app.inject({
			method: "GET",
			url: `/api/workspaces/${workspace.id}`,
			cookies,
		});

		expect(res.statusCode).toBe(200);
		const body = JSON.parse(res.body);
		expect(body.success).toBe(true);
		expect(body.data).toBeDefined();
		expect(body.data.id).toBe(workspace.id);
		expect(body.data.name).toBe(workspace.name);

		await cleanupWorkspace(workspace.id);
	});

	test("user can fetch all workspaces", async () => {
		const workspace = await createWorkspace(cookies);

		const res = await app.inject({
			method: "GET",
			url: "/api/workspaces",
			cookies,
		});

		expect(res.statusCode).toBe(200);
		const body = JSON.parse(res.body);
		expect(body.success).toBe(true);
		expect(body.data).toBeDefined();
		expect(Array.isArray(body.data)).toBe(true);
		expect(body.data.length).toBeGreaterThan(0);
		const foundWorkspace = body.data.find(
			(w: Workspace) => w.id === workspace.id,
		);
		expect(foundWorkspace).toBeDefined();
		expect(foundWorkspace.id).toBe(workspace.id);
		expect(foundWorkspace.name).toBe(workspace.name);

		await cleanupWorkspace(workspace.id);
	});

	test("user can update workspace name", async () => {
		const workspace = await createWorkspace(cookies);
		const newName = faker.word.noun();

		const res = await app.inject({
			method: "PATCH",
			url: `/api/workspaces/${workspace.id}`,
			body: { name: newName },
			cookies,
		});

		expect(res.statusCode).toBe(200);
		const body = JSON.parse(res.body);
		expect(body.success).toBe(true);

		const verifyRes = await app.inject({
			method: "GET",
			url: `/api/workspaces/${workspace.id}`,
			cookies,
		});
		const verifyBody = JSON.parse(verifyRes.body);
		expect(verifyBody.data.name).toBe(newName);

		await cleanupWorkspace(workspace.id);
	});

	test("non-member cannot fetch workspace details", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/workspaces/00000000-0000-0000-0000-000000000000",
			cookies: {},
		});

		expect(res.statusCode).toBe(401);
	});

	test("non-owner cannot update workspace", async () => {
		const res = await app.inject({
			method: "PATCH",
			url: "/api/workspaces/00000000-0000-0000-0000-000000000000",
			body: { name: faker.word.noun() },
			cookies: {},
		});

		expect(res.statusCode).toBe(401);
	});

	test("non-owner cannot delete workspace", async () => {
		const res = await app.inject({
			method: "DELETE",
			url: "/api/workspaces/00000000-0000-0000-0000-000000000000",
			cookies: {},
		});

		expect(res.statusCode).toBe(401);
	});

	test("owner can invite members", async () => {
		const workspace = await createWorkspace(cookies);
		const { user: secondUser } = await createUser();

		const res = await app.inject({
			method: "POST",
			url: `/api/workspaces/${workspace.id}/invite`,
			body: { userIds: [secondUser.id] },
			cookies,
		});

		expect(res.statusCode).toBe(200);
		const body = JSON.parse(res.body);
		expect(body.success).toBe(true);

		await cleanupWorkspace(workspace.id);
		await cleanupUser(secondUser.id);
	});

	test("owner can get workspace invites", async () => {
		const workspace = await createWorkspace(cookies);
		const { user: secondUser } = await createUser();

		await app.inject({
			method: "POST",
			url: `/api/workspaces/${workspace.id}/invite`,
			body: { userIds: [secondUser.id] },
			cookies,
		});

		const res = await app.inject({
			method: "GET",
			url: `/api/workspaces/${workspace.id}/invites`,
			cookies,
		});

		expect(res.statusCode).toBe(200);
		const body = JSON.parse(res.body);
		expect(body.success).toBe(true);
		expect(body.data).toBeDefined();
		expect(Array.isArray(body.data)).toBe(true);
		expect(body.data.length).toBeGreaterThan(0);
		expect(
			body.data.some(
				(invite: WorkspaceInvite) => invite.userId === secondUser.id,
			),
		).toBe(true);

		await cleanupWorkspace(workspace.id);
		await cleanupUser(secondUser.id);
	});

	test("user can get their invites", async () => {
		const workspace = await createWorkspace(cookies);
		const { user: secondUser, cookies: secondUserCookies } = await createUser();

		await app.inject({
			method: "POST",
			url: `/api/workspaces/${workspace.id}/invite`,
			body: { userIds: [secondUser.id] },
			cookies,
		});

		const res = await app.inject({
			method: "GET",
			url: "/api/invites",
			cookies: secondUserCookies,
		});

		expect(res.statusCode).toBe(200);
		const body = JSON.parse(res.body);
		expect(body.success).toBe(true);
		expect(body.data).toBeDefined();
		expect(Array.isArray(body.data)).toBe(true);
		expect(body.data.length).toBeGreaterThan(0);
		expect(
			body.data.some(
				(invite: WorkspaceInvite) => invite.workspaceId === workspace.id,
			),
		).toBe(true);

		await cleanupWorkspace(workspace.id);
		await cleanupUser(secondUser.id);
	});

	test("user can accept workspace invite", async () => {
		const workspace = await createWorkspace(cookies);
		const { user: secondUser, cookies: secondUserCookies } = await createUser();

		await app.inject({
			method: "POST",
			url: `/api/workspaces/${workspace.id}/invite`,
			body: { userIds: [secondUser.id] },
			cookies,
		});

		const res = await app.inject({
			method: "POST",
			url: `/api/invites/${workspace.id}/response`,
			body: { action: "accept" },
			cookies: secondUserCookies,
		});

		expect(res.statusCode).toBe(200);
		const body = JSON.parse(res.body);
		expect(body.success).toBe(true);

		const verifyRes = await app.inject({
			method: "GET",
			url: "/api/workspaces",
			cookies: secondUserCookies,
		});
		const verifyBody = JSON.parse(verifyRes.body);
		const foundWorkspace = verifyBody.data.find(
			(w: Workspace) => w.id === workspace.id,
		);
		expect(foundWorkspace).toBeDefined();
		expect(foundWorkspace.role).toBe("MEMBER");

		await cleanupWorkspace(workspace.id);
		await cleanupUser(secondUser.id);
	});

	test("user can reject workspace invite", async () => {
		const workspace = await createWorkspace(cookies);
		const { user: secondUser, cookies: secondUserCookies } = await createUser();

		await app.inject({
			method: "POST",
			url: `/api/workspaces/${workspace.id}/invite`,
			body: { userIds: [secondUser.id] },
			cookies,
		});

		const res = await app.inject({
			method: "POST",
			url: `/api/invites/${workspace.id}/response`,
			body: { action: "reject" },
			cookies: secondUserCookies,
		});

		expect(res.statusCode).toBe(200);
		const body = JSON.parse(res.body);
		expect(body.success).toBe(true);

		const verifyRes = await app.inject({
			method: "GET",
			url: "/api/workspaces",
			cookies: secondUserCookies,
		});
		const verifyBody = JSON.parse(verifyRes.body);
		const foundWorkspace = verifyBody.data.find(
			(w: Workspace) => w.id === workspace.id,
		);
		expect(foundWorkspace).toBeUndefined();

		await cleanupWorkspace(workspace.id);
	});

	test("user can delete workspace", async () => {
		const workspace = await createWorkspace(cookies);

		const res = await app.inject({
			method: "DELETE",
			url: `/api/workspaces/${workspace.id}`,
			cookies,
		});

		expect(res.statusCode).toBe(200);
		const body = JSON.parse(res.body);
		expect(body.success).toBe(true);

		const verifyRes = await app.inject({
			method: "GET",
			url: `/api/workspaces/${workspace.id}`,
			cookies,
		});
		expect(verifyRes.statusCode).toBe(403);
	});
});
