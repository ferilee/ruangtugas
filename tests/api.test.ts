import { beforeAll, describe, expect, it } from "bun:test";
import { api } from "../src/api/router";
import { bootstrapDb } from "../src/db/bootstrap";

beforeAll(async () => {
  // Ensure we are using in-memory DB for tests
  process.env.DB_PATH = ":memory:";
  await bootstrapDb();
});

describe("API Backend Tests", () => {
  it("GET /health - Cek kesehatan API", async () => {
    const res = await api.request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("GET /config - Cek konfigurasi", async () => {
    const res = await api.request("/config");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("googleClientId");
  });

  it("GET /stats/summary - Cek statistik global", async () => {
    const res = await api.request("/stats/summary");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.teachers).toBe("number");
    expect(typeof data.students).toBe("number");
    expect(typeof data.assignments).toBe("number");
  });

  describe("Manajemen User", () => {
    let newUserId: number;

    it("POST /users - Tambah user baru (Admin)", async () => {
      const newUser = {
        name: "Test User",
        email: "test@example.com",
        role: "student",
        className: "X RPL 1"
      };
      const res = await api.request("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser)
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      newUserId = data.id;
      expect(data.name).toBe(newUser.name);
    });

    it("GET /users - List semua user", async () => {
      const res = await api.request("/users");
      expect(res.status).toBe(200);
      const users = await res.json();
      expect(users.some((u: any) => u.email === "test@example.com")).toBe(true);
    });

    it("GET /users/:id - Detail user", async () => {
      const res = await api.request(`/users/${newUserId}`);
      expect(res.status).toBe(200);
      const user = await res.json();
      expect(user.id).toBe(newUserId);
    });

    it("PATCH /users/:id - Update user", async () => {
      const res = await api.request(`/users/${newUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" })
      });
      expect(res.status).toBe(200);
      const user = await res.json();
      expect(user.name).toBe("Updated Name");
    });

    it("DELETE /users/:id - Hapus user", async () => {
      const res = await api.request(`/users/${newUserId}`, { method: "DELETE" });
      expect(res.status).toBe(200);
    });
  });

  describe("Assignments & Submissions", () => {
    let teacherId: number;
    let assignmentId: number;

    beforeAll(async () => {
      const res = await api.request("/users");
      const users = await res.json();
      teacherId = users.find((u: any) => u.role === "teacher").id;
    });

    it("POST /assignments - Buat tugas baru", async () => {
      const newAssignment = {
        teacherId,
        title: "Tugas Matematika",
        description: "Kerjakan halaman 10",
        deadline: new Date(Date.now() + 86400000).toISOString()
      };
      const res = await api.request("/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAssignment)
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      assignmentId = data.assignment.id;
      expect(data.assignment.title).toBe(newAssignment.title);
    });

    it("GET /assignments - List tugas", async () => {
      const res = await api.request("/assignments");
      expect(res.status).toBe(200);
      const assignments = await res.json();
      expect(assignments.length).toBeGreaterThan(0);
    });

    it("GET /assignments/:id/tracker - Cek tracker tugas", async () => {
      const res = await api.request(`/assignments/${assignmentId}/tracker`);
      expect(res.status).toBe(200);
      const tracker = await res.json();
      expect(Array.isArray(tracker)).toBe(true);
    });
  });
});
