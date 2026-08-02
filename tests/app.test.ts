import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildApp } from "../src/app.js";

test("health reports an unconfigured OpenAI client", async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "assistant-app-"));
  const app = await buildApp({ dataDir: temporary, workspaceRoot: temporary, logger: false });
  const response = await app.inject({ method: "GET", url: "/health" });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().openAiConfigured, false);
  await app.close();
});

test("memories can be created, listed, and deleted", async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "assistant-app-"));
  const app = await buildApp({ dataDir: temporary, workspaceRoot: temporary, logger: false });

  const created = await app.inject({
    method: "POST",
    url: "/api/memories",
    payload: { category: "preference", content: "Use concise answers." },
  });
  assert.equal(created.statusCode, 201);

  const listed = await app.inject({ method: "GET", url: "/api/memories" });
  assert.equal(listed.json().length, 1);

  const deleted = await app.inject({
    method: "DELETE",
    url: `/api/memories/${created.json().id}`,
  });
  assert.equal(deleted.statusCode, 204);
  await app.close();
});
