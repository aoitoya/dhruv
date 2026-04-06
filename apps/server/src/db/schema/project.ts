import { sql } from "drizzle-orm";
import {
	date,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";
import { workspace } from "./workspace.js";

export const projectStatus = pgEnum("project_status", ["ACTIVE", "ARCHIVED"]);

export const project = pgTable("project", {
	id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
	workspaceId: uuid("workspace_id")
		.notNull()
		.references(() => workspace.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	description: text("description"),
	status: projectStatus("status").notNull().default("ACTIVE"),
	color: text("color"),
	dueDate: date("due_date"),
	createdBy: text("created_by").references(() => user.id, {
		onDelete: "set null",
	}),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at")
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
});

export const projectMember = pgTable(
	"project_member",
	{
		projectId: uuid("project_id")
			.notNull()
			.references(() => project.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		joinedAt: timestamp("joined_at").notNull().defaultNow(),
	},
	(table) => [primaryKey({ columns: [table.projectId, table.userId] })],
);
