import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  googleSub: text("google_sub"),
  role: text("role", { enum: ["teacher", "student", "admin"] }).notNull(),
  subject: text("subject"),
  major: text("major"),
  className: text("class_name"),
  profileCompleted: integer("profile_completed", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull()
});

export const assignments = sqliteTable("assignments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teacherId: integer("teacher_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  attachmentUrl: text("attachment_url"),
  deadline: integer("deadline", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull()
});

export const submissions = sqliteTable("submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  assignmentId: integer("assignment_id")
    .notNull()
    .references(() => assignments.id),
  studentId: integer("student_id")
    .notNull()
    .references(() => users.id),
  answerText: text("answer_text"),
  answerFileUrl: text("answer_file_url"),
  status: text("status", { enum: ["draft", "submitted", "graded"] })
    .notNull()
    .default("draft"),
  score: integer("score"),
  feedback: text("feedback"),
  submittedAt: integer("submitted_at", { mode: "timestamp_ms" }),
  gradedAt: integer("graded_at", { mode: "timestamp_ms" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull()
});

export const usersRelations = relations(users, ({ many }) => ({
  assignments: many(assignments),
  submissions: many(submissions)
}));

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  teacher: one(users, {
    fields: [assignments.teacherId],
    references: [users.id]
  }),
  submissions: many(submissions)
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  assignment: one(assignments, {
    fields: [submissions.assignmentId],
    references: [assignments.id]
  }),
  student: one(users, {
    fields: [submissions.studentId],
    references: [users.id]
  })
}));

export type User = typeof users.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
