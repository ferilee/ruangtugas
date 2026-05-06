import { Hono } from "hono";
import { serveStatic } from "hono/bun";

import { api } from "@/api/router";
import { bootstrapDb } from "@/db/bootstrap";

await bootstrapDb();

const app = new Hono();

app.route("/api", api);
app.use("/uploads/*", serveStatic({ root: "./" }));
app.use("/*", serveStatic({ root: "./public" }));

app.get("*", (c) => c.redirect("/index.html"));

const port = Number(process.env.PORT ?? 2003);

const server = Bun.serve({
  port,
  fetch: app.fetch
});

console.log(`RuangTugas running on http://localhost:${server.port}`);
