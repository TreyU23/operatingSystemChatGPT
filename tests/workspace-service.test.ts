import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { WorkspaceService } from "../src/services/workspace-service.js";

test("workspace paths cannot escape the configured root", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "assistant-workspace-"));
  const workspace = new WorkspaceService(root);
  await assert.rejects(
    workspace.resolveSafePath("../outside.txt"),
    /outside the configured workspace/,
  );
});

test("workspace file listing and reading stay local", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "assistant-workspace-"));
  await mkdir(path.join(root, "notes"));
  await writeFile(path.join(root, "notes", "hello.txt"), "hello", "utf8");
  const workspace = new WorkspaceService(root);

  assert.deepEqual(await workspace.listFiles(), [path.join("notes", "hello.txt")]);
  assert.deepEqual(await workspace.readTextFile("notes/hello.txt"), {
    path: path.join("notes", "hello.txt"),
    content: "hello",
  });
});
