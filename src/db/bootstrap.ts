import { and, eq } from "drizzle-orm";

import { db, sqlite } from "./index";
import { submissions, users } from "./schema";

export async function bootstrapDb() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      google_sub TEXT,
      role TEXT NOT NULL CHECK(role IN ('teacher','student','admin')),
      subject TEXT,
      major TEXT,
      class_name TEXT,
      profile_completed INTEGER NOT NULL DEFAULT 0,
      picture_url TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      attachment_url TEXT,
      link_url TEXT,
      target_class TEXT,
      deadline INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(teacher_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      answer_text TEXT,
      answer_file_url TEXT,
      answer_link_url TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','graded')),
      score INTEGER,
      feedback TEXT,
      submitted_at INTEGER,
      graded_at INTEGER,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(assignment_id) REFERENCES assignments(id),
      FOREIGN KEY(student_id) REFERENCES users(id),
      UNIQUE(assignment_id, student_id)
    );
  `);

  const usersTableColumns = sqlite.query("PRAGMA table_info(users)").all() as Array<{ name: string }>;
  const hasGoogleSub = usersTableColumns.some((col) => col.name === "google_sub");
  const hasSubject = usersTableColumns.some((col) => col.name === "subject");
  const hasMajor = usersTableColumns.some((col) => col.name === "major");
  const hasClassName = usersTableColumns.some((col) => col.name === "class_name");
  const hasProfileCompleted = usersTableColumns.some((col) => col.name === "profile_completed");
  
  // Check if role constraint needs update (SQLite doesn't support ALTER TABLE for constraints)
  const usersSchema = sqlite.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get() as { sql: string };
  const needsAdminRole = !usersSchema.sql.includes("'admin'");

  if (needsAdminRole) {
    console.log("Migrating users table to include 'admin' role...");
    const subjectSelect = hasSubject ? "subject" : "NULL";
    const majorSelect = hasMajor ? "major" : "NULL";
    const classNameSelect = hasClassName ? "class_name" : "NULL";
    const profileCompletedSelect = hasProfileCompleted ? "COALESCE(profile_completed, 0)" : "0";
    sqlite.exec(`
      PRAGMA foreign_keys=OFF;
      BEGIN TRANSACTION;
      CREATE TABLE users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        google_sub TEXT,
        role TEXT NOT NULL CHECK(role IN ('teacher','student','admin')),
        subject TEXT,
        major TEXT,
        class_name TEXT,
        profile_completed INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
      INSERT INTO users_new (id, name, email, google_sub, role, subject, major, class_name, profile_completed, created_at)
      SELECT id, name, email, google_sub, role, ${subjectSelect}, ${majorSelect}, ${classNameSelect}, ${profileCompletedSelect}, created_at FROM users;
      DROP TABLE users;
      ALTER TABLE users_new RENAME TO users;
      COMMIT;
      PRAGMA foreign_keys=ON;
    `);
  } else {
    if (!hasGoogleSub) sqlite.exec("ALTER TABLE users ADD COLUMN google_sub TEXT");
    if (!hasSubject) sqlite.exec("ALTER TABLE users ADD COLUMN subject TEXT");
    if (!hasMajor) sqlite.exec("ALTER TABLE users ADD COLUMN major TEXT");
    if (!hasClassName) sqlite.exec("ALTER TABLE users ADD COLUMN class_name TEXT");
    if (!hasProfileCompleted) {
      sqlite.exec("ALTER TABLE users ADD COLUMN profile_completed INTEGER NOT NULL DEFAULT 0");
    }
    if (!usersTableColumns.some(col => col.name === "picture_url")) {
      sqlite.exec("ALTER TABLE users ADD COLUMN picture_url TEXT");
    }

    const assignmentsTableColumns = sqlite.query("PRAGMA table_info(assignments)").all() as Array<{ name: string }>;
    if (!assignmentsTableColumns.some((col) => col.name === "link_url")) {
      sqlite.exec("ALTER TABLE assignments ADD COLUMN link_url TEXT");
    }
    if (!assignmentsTableColumns.some((col) => col.name === "target_class")) {
      sqlite.exec("ALTER TABLE assignments ADD COLUMN target_class TEXT");
    }

    const submissionsTableColumns = sqlite.query("PRAGMA table_info(submissions)").all() as Array<{ name: string }>;
    if (!submissionsTableColumns.some((col) => col.name === "answer_link_url")) {
      sqlite.exec("ALTER TABLE submissions ADD COLUMN answer_link_url TEXT");
    }
  }

  const now = new Date();
  const seedUsers = [
    { name: "Pak Budi", email: "budi@guru.id", role: "teacher" as const },
    { name: "Siti", email: "siti@murid.id", role: "student" as const },
    { name: "Andi", email: "andi@murid.id", role: "student" as const },
    { name: "Feri Lee (Admin)", email: "the.real.ferilee@gmail.com", role: "admin" as const }
  ];

  for (const user of seedUsers) {
    const existing = await db.select().from(users).where(eq(users.email, user.email)).limit(1);
    if (existing.length === 0) {
      await db.insert(users).values({ ...user, createdAt: now });
    }
  }

  const allStudents = await db.select().from(users).where(eq(users.role, "student"));
  const assignmentsRows = sqlite
    .query("SELECT id FROM assignments LIMIT 1")
    .all() as Array<{ id: number }>;

  if (assignmentsRows.length > 0) {
    const assignmentId = assignmentsRows[0].id;
    for (const student of allStudents) {
      const existingSubmission = await db
        .select()
        .from(submissions)
        .where(and(eq(submissions.assignmentId, assignmentId), eq(submissions.studentId, student.id)))
        .limit(1);
      if (existingSubmission.length === 0) {
        await db.insert(submissions).values({
          assignmentId,
          studentId: student.id,
          status: "draft",
          updatedAt: now
        });
      }
    }
  }
}
