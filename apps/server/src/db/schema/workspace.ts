import { sql } from "drizzle-orm";
import {
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";

export const workspace = pgTable("workspace", {
	id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
	name: text("name").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at")
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
});

export const workspaceRole = pgEnum("workspace_role", [
	"OWNER",
	"ADMIN",
	"MEMBER",
]);
export const workspaceMemberStatus = pgEnum("workspace_member_status", [
	"ACTIVE",
	"LEFT",
	"REMOVED",
]);

export const workspaceMember = pgTable(
	"workspace_member",
	{
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		workspaceId: uuid("workspace_id")
			.notNull()
			.references(() => workspace.id, { onDelete: "cascade" }),
		role: workspaceRole("role").notNull(),
		status: workspaceMemberStatus("status").notNull().default("ACTIVE"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at")
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [primaryKey({ columns: [table.workspaceId, table.userId] })],
);

export const workspaceInviteStatus = pgEnum("workspace_invite_status", [
	"PENDING",
	"ACCEPTED",
	"REJECTED",
	"EXPIRED",
]);

export const workspaceInvite = pgTable(
	"workspace_invite",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		workspaceId: uuid("workspace_id")
			.notNull()
			.references(() => workspace.id, { onDelete: "cascade" }),
		email: text("email").notNull(),
		role: workspaceRole("role").notNull().default("MEMBER"),
		invitedBy: uuid("invited_by").references(() => user.id, {
			onDelete: "set null",
		}),
		tokenHash: text("token_hash").notNull(),
		status: workspaceInviteStatus("status").default("PENDING"),
		expiresAt: timestamp("expires_at").notNull(),
		createdAt: timestamp("created_at").defaultNow(),
	},
	(table) => [
		uniqueIndex("unique_pending_invite_idx")
			.on(table.workspaceId, table.email)
			.where(sql`${table.status} = 'PENDING'`),
	],
);

export const workspaceInvitation = pgTable(
	"workspace_invitation",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		workspaceId: uuid("workspace_id")
			.notNull()
			.references(() => workspace.id, { onDelete: "cascade" }),
		invitedBy: text("invited_by")
			.notNull()
			.references(() => user.id),
		email: text("email").notNull(),
		role: workspaceRole("role").notNull().default("MEMBER"),
		tokenHash: text("token_hash").notNull().unique(),
		status: workspaceInviteStatus("status").notNull().default("PENDING"),
		expiresAt: timestamp("expires_at").notNull(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("unique_pending_invitation_idx")
			.on(table.workspaceId, table.email)
			.where(sql`${table.status} = 'PENDING'`),
	],
);
