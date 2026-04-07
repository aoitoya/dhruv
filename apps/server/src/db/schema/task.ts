import { sql } from "drizzle-orm";
import {
	date,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";
import { project } from "./project.js";

export const taskStatus = pgEnum("task_status", [
	"todo",
	"in_progress",
	"in_review",
	"done",
]);

export const taskPriority = pgEnum("task_priority", [
	"critical",
	"high",
	"medium",
	"low",
]);

export const task = pgTable("task", {
	id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
	projectId: uuid("project_id")
		.notNull()
		.references(() => project.id, { onDelete: "cascade" }),
	parentTaskId: uuid("parent_task_id").references((): any => task.id, {
		onDelete: "cascade",
	}),
	title: text("title").notNull(),
	description: text("description"),
	status: taskStatus("status").notNull().default("todo"),
	priority: taskPriority("priority"),
	assigneeId: text("assignee_id").references(() => user.id, {
		onDelete: "set null",
	}),
	dueDate: date("due_date"),
	position: integer("position").notNull(),
	createdBy: text("created_by")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at")
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
});
