import { sql } from "drizzle-orm";
import {
	type AnyPgColumn,
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
	"TODO",
	"IN_PROGRESS",
	"IN_REVIEW",
	"DONE",
]);

export const taskPriority = pgEnum("task_priority", [
	"CRITICAL",
	"HIGH",
	"MEDIUM",
	"LOW",
]);

export const task = pgTable("task", {
	id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
	projectId: uuid("project_id")
		.notNull()
		.references(() => project.id, { onDelete: "cascade" }),
	parentTaskId: uuid("parent_task_id").references((): AnyPgColumn => task.id, {
		onDelete: "cascade",
	}),
	title: text("title").notNull(),
	description: text("description"),
	status: taskStatus("status").notNull().default("TODO"),
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

export const comment = pgTable("comment", {
	id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
	taskId: uuid("task_id")
		.notNull()
		.references(() => task.id, { onDelete: "cascade" }),
	authorId: text("author_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	content: text("content").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at")
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
});
