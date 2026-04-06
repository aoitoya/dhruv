import { sql } from "drizzle-orm";
import {
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
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

export const workspaceRole = pgEnum("workspace_role", ["OWNER", "MEMBER"]);
export const workspaceMemberStatus = pgEnum("workspace_member_status", [
	"ACTIVE",
	"LEFT",
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
]);

export const workspaceInvite = pgTable(
	"workspace_invite",
	{
		workspaceId: uuid("workspace_id")
			.notNull()
			.references(() => workspace.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		status: workspaceInviteStatus("status").default("PENDING"),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at")
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [primaryKey({ columns: [table.workspaceId, table.userId] })],
);
