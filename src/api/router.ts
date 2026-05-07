import { Hono } from "hono";
import { and, asc, desc, eq, isNull, or, sql } from "drizzle-orm";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";

import { db } from "@/db";
import { assignments, submissions, users } from "@/db/schema";

const createAssignmentSchema = z.object({
  teacherId: z.number().int(),
  title: z.string().min(3),
  description: z.string().min(3),
  deadline: z.string().datetime(),
  attachmentUrl: z.string().optional(),
  linkUrl: z.string().optional(),
  targetClass: z.string().optional()
});

const submissionSchema = z.object({
  answerText: z.string().optional(),
  answerFileUrl: z.string().optional(),
  answerLinkUrl: z.string().optional(),
  status: z.enum(["draft", "submitted"])
});

const gradingSchema = z.object({
  score: z.number().int().min(0).max(100),
  feedback: z.string().min(2)
});

const googleLoginSchema = z.object({
  credential: z.string().min(10),
  role: z.enum(["teacher", "student", "admin"]).optional()
});

const updateProfileSchema = z.object({
  name: z.string().min(3),
  subject: z.string().optional(),
  major: z.string().optional(),
  className: z.string().min(1)
});

const adminUserSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  role: z.enum(["teacher", "student", "admin"]),
  subject: z.string().optional().nullable(),
  major: z.string().optional().nullable(),
  className: z.string().optional().nullable()
});

const googleClient = new OAuth2Client();

export const api = new Hono();

function needsProfile(user: {
  role: string;
  name: string;
  subject: string | null;
  major: string | null;
  className: string | null;
  profileCompleted: boolean;
}) {
  if (user.profileCompleted) return false;
  if (user.role === "teacher" || user.role === "admin") {
    return !user.name || !user.subject || !user.className;
  }
  if (user.role === "student") {
    return !user.name || !user.major || !user.className;
  }
  return true;
}

api.get("/health", (c) => c.json({ ok: true }));

api.get("/config", (c) =>
  c.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? null
  })
);

api.get("/stats/summary", async (c) => {
  const [userCounts] = await db
    .select({
      teachers: sql<number>`count(case when ${users.role} = 'teacher' then 1 end)`,
      students: sql<number>`count(case when ${users.role} = 'student' then 1 end)`
    })
    .from(users);

  const [assignmentCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(assignments);

  return c.json({
    teachers: Number(userCounts?.teachers || 0),
    students: Number(userCounts?.students || 0),
    assignments: Number(assignmentCount?.count || 0)
  });
});

api.post("/auth/login", async (c) => {
  const body = await c.req.json();
  const parsed = z.object({ email: z.string().email() }).safeParse(body);
  if (!parsed.success) {
    return c.json({ message: "Email tidak valid." }, 400);
  }
  const user = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (!user[0]) {
    return c.json({ message: "User tidak ditemukan." }, 404);
  }
  return c.json({ user: user[0], needsProfile: needsProfile(user[0]) });
});

api.post("/auth/google", async (c) => {
  const body = await c.req.json();
  const parsed = googleLoginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ message: "Payload login Google tidak valid." }, 400);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return c.json({ message: "GOOGLE_CLIENT_ID belum diset di environment." }, 500);
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: parsed.data.credential,
      audience: clientId
    });
    const payload = ticket.getPayload();

    if (!payload?.email || !payload.email_verified || !payload.sub) {
      return c.json({ message: "Token Google tidak berisi identitas yang valid." }, 401);
    }

    const email = payload.email;
    let expectedRole: "teacher" | "student" | "admin" = "student";

    if (email === "the.real.ferilee@gmail.com") {
      expectedRole = "admin";
    } else if (
      email.endsWith("@guru.smk.belajar.id") ||
      email.endsWith("@guru.sma.belajar.id") ||
      email.endsWith("@guru.smp.belajar.id")
    ) {
      expectedRole = "teacher";
    }

    const existing = await db.select().from(users).where(eq(users.email, payload.email)).limit(1);
    if (existing[0]) {
      const updates: any = {};
      if (!existing[0].googleSub) {
        updates.googleSub = payload.sub;
      }
      if (existing[0].role !== expectedRole) {
        updates.role = expectedRole;
      }
      if (payload.picture && existing[0].pictureUrl !== payload.picture) {
        updates.pictureUrl = payload.picture;
      }

      if (Object.keys(updates).length > 0) {
        const [updated] = await db
          .update(users)
          .set(updates)
          .where(eq(users.id, existing[0].id))
          .returning();
        return c.json({ user: updated, needsProfile: needsProfile(updated) });
      }
      return c.json({ user: existing[0], needsProfile: needsProfile(existing[0]) });
    }

    const [created] = await db
      .insert(users)
      .values({
        name: payload.name || payload.email,
        email: payload.email,
        googleSub: payload.sub,
        role: expectedRole,
        profileCompleted: false,
        pictureUrl: payload.picture,
        createdAt: new Date()
      })
      .returning();

    return c.json({ user: created, needsProfile: needsProfile(created) }, 201);
  } catch {
    return c.json({ message: "Verifikasi token Google gagal." }, 401);
  }
});

api.patch("/users/:id/profile", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ message: "Payload profil tidak valid." }, 400);
  }

  const existing = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!existing[0]) {
    return c.json({ message: "User tidak ditemukan." }, 404);
  }

  const role = existing[0].role;
  if ((role === "teacher" || role === "admin") && !parsed.data.subject) {
    return c.json({ message: "Guru wajib mengisi mapel yang diampu." }, 400);
  }
  if (role === "student" && !parsed.data.major) {
    return c.json({ message: "Murid wajib mengisi jurusan." }, 400);
  }

  const [updated] = await db
    .update(users)
    .set({
      name: parsed.data.name,
      subject: role === "teacher" || role === "admin" ? parsed.data.subject ?? null : null,
      major: role === "student" ? parsed.data.major ?? null : null,
      className: parsed.data.className,
      profileCompleted: true
    })
    .where(eq(users.id, id))
    .returning();

  return c.json({ user: updated, needsProfile: needsProfile(updated) });
});

api.get("/users", async (c) => {
  const role = c.req.query("role");
  if (role === "teacher" || role === "student" || role === "admin") {
    return c.json(await db.select().from(users).where(eq(users.role, role)).orderBy(asc(users.name)));
  }
  return c.json(await db.select().from(users).orderBy(asc(users.name)));
});

api.get("/users/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const user = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user[0]) return c.json({ message: "User tidak ditemukan" }, 404);
  return c.json(user[0]);
});

api.post("/users", async (c) => {
  const body = await c.req.json();
  const parsed = adminUserSchema.safeParse(body);
  if (!parsed.success) return c.json({ message: "Data user tidak valid" }, 400);

  const existing = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (existing[0]) return c.json({ message: "Email sudah terdaftar" }, 400);

  const [created] = await db
    .insert(users)
    .values({
      ...parsed.data,
      profileCompleted: true,
      createdAt: new Date()
    })
    .returning();
  return c.json(created, 201);
});

api.patch("/users/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const parsed = adminUserSchema.partial().safeParse(body);
  if (!parsed.success) return c.json({ message: "Data update tidak valid" }, 400);

  const [updated] = await db
    .update(users)
    .set(parsed.data)
    .where(eq(users.id, id))
    .returning();
  
  if (!updated) return c.json({ message: "User tidak ditemukan" }, 404);
  return c.json(updated);
});

api.delete("/users/:id", async (c) => {
  const id = Number(c.req.param("id"));
  
  // Optional: check if user has submissions or assignments
  const userSubmissions = await db.select().from(submissions).where(eq(submissions.studentId, id)).limit(1);
  const userAssignments = await db.select().from(assignments).where(eq(assignments.teacherId, id)).limit(1);
  
  if (userSubmissions.length > 0 || userAssignments.length > 0) {
    return c.json({ message: "User tidak bisa dihapus karena memiliki data terkait (tugas/pengumpulan)." }, 400);
  }

  const [deleted] = await db.delete(users).where(eq(users.id, id)).returning();
  if (!deleted) return c.json({ message: "User tidak ditemukan" }, 404);
  return c.json({ message: "User berhasil dihapus" });
});

api.get("/assignments", async (c) => {
  const role = c.req.query("role");
  const userId = Number(c.req.query("userId"));

  if (role === "teacher") {
    const teacherAssignments = await db
      .select({
        id: assignments.id,
        title: assignments.title,
        description: assignments.description,
        deadline: assignments.deadline,
        attachmentUrl: assignments.attachmentUrl,
        linkUrl: assignments.linkUrl,
        createdAt: assignments.createdAt,
        totalStudents: sql<number>`count(distinct ${submissions.studentId})`,
        submittedCount: sql<number>`count(distinct case when ${submissions.status} = 'submitted' or ${submissions.status} = 'graded' then ${submissions.studentId} end)`
      })
      .from(assignments)
      .leftJoin(submissions, eq(submissions.assignmentId, assignments.id))
      .where(eq(assignments.teacherId, userId))
      .groupBy(assignments.id)
      .orderBy(desc(assignments.deadline));
    return c.json(teacherAssignments);
  }

  if (role === "student") {
    const studentResult = await db.select({ className: users.className }).from(users).where(eq(users.id, userId)).limit(1);
    if (!studentResult[0]) return c.json({ message: "User tidak ditemukan" }, 404);
    const studentClass = studentResult[0].className || "";

    const filtered = await db
      .select({
        id: assignments.id,
        submissionId: submissions.id,
        title: assignments.title,
        description: assignments.description,
        deadline: assignments.deadline,
        attachmentUrl: assignments.attachmentUrl,
        linkUrl: assignments.linkUrl,
        teacherName: users.name,
        submissionStatus: submissions.status,
        score: submissions.score,
        submittedAt: submissions.submittedAt
      })
      .from(assignments)
      .innerJoin(users, eq(users.id, assignments.teacherId))
      .leftJoin(
        submissions,
        and(eq(submissions.assignmentId, assignments.id), eq(submissions.studentId, userId))
      )
      .where(
        or(
          isNull(assignments.targetClass),
          eq(assignments.targetClass, ""),
          eq(assignments.targetClass, studentClass)
        )
      )
      .orderBy(asc(assignments.deadline));

    return c.json(filtered);
  }

  return c.json(await db.select().from(assignments).orderBy(desc(assignments.createdAt)));
});

api.post("/assignments", async (c) => {
  const body = await c.req.json();
  const parsed = createAssignmentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ message: "Payload assignment tidak valid." }, 400);
  }

  const now = new Date();
  const [assignment] = await db
    .insert(assignments)
    .values({
      ...parsed.data,
      deadline: new Date(parsed.data.deadline),
      createdAt: now
    })
    .returning();

  const students = await db.select().from(users).where(eq(users.role, "student"));
  if (students.length > 0) {
    await db.insert(submissions).values(
      students.map((student) => ({
        assignmentId: assignment.id,
        studentId: student.id,
        status: "draft" as const,
        updatedAt: now
      }))
    );
  }

  return c.json({ assignment }, 201);
});

api.get("/assignments/:id/tracker", async (c) => {
  const assignmentId = Number(c.req.param("id"));
  const rows = await db
    .select({
      submissionId: submissions.id,
      studentId: users.id,
      studentName: users.name,
      studentClass: users.className,
      status: submissions.status,
      updatedAt: submissions.updatedAt,
      submittedAt: submissions.submittedAt,
      score: submissions.score,
      answerText: submissions.answerText,
      answerFileUrl: submissions.answerFileUrl
    })
    .from(submissions)
    .innerJoin(users, eq(users.id, submissions.studentId))
    .where(eq(submissions.assignmentId, assignmentId))
    .orderBy(asc(users.name));
  return c.json(rows);
});

api.get("/student/:studentId/submissions", async (c) => {
  const studentId = Number(c.req.param("studentId"));
  const rows = await db
    .select({
      submissionId: submissions.id,
      assignmentId: assignments.id,
      title: assignments.title,
      deadline: assignments.deadline,
      status: submissions.status,
      score: submissions.score,
      feedback: submissions.feedback,
      answerText: submissions.answerText,
      answerFileUrl: submissions.answerFileUrl,
      submittedAt: submissions.submittedAt
    })
    .from(submissions)
    .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
    .where(eq(submissions.studentId, studentId))
    .orderBy(asc(assignments.deadline));
  return c.json(rows);
});

api.patch("/submissions/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ message: "Payload submission tidak valid." }, 400);
  }

  const now = new Date();
  const updated = await db
    .update(submissions)
    .set({
      answerText: parsed.data.answerText ?? null,
      answerFileUrl: parsed.data.answerFileUrl ?? null,
      status: parsed.data.status,
      submittedAt: parsed.data.status === "submitted" ? now : null,
      updatedAt: now
    })
    .where(eq(submissions.id, id))
    .returning();
  return c.json({ submission: updated[0] });
});

api.patch("/submissions/:id/grade", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const parsed = gradingSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ message: "Payload grading tidak valid." }, 400);
  }
  const now = new Date();
  const updated = await db
    .update(submissions)
    .set({
      status: "graded",
      score: parsed.data.score,
      feedback: parsed.data.feedback,
      gradedAt: now,
      updatedAt: now
    })
    .where(eq(submissions.id, id))
    .returning();
  return c.json({ submission: updated[0] });
});

api.post("/upload", async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return c.json({ message: "File tidak ditemukan." }, 400);
  }
  const safeName = `${Date.now()}-${file.name.replaceAll(" ", "_")}`;
  const uploadPath = `uploads/${safeName}`;
  await Bun.write(uploadPath, await file.arrayBuffer());
  return c.json({ url: `/uploads/${safeName}` });
});
