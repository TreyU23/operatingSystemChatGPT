import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ActionService } from "../src/services/action-service.js";
import { MemoryService } from "../src/services/memory-service.js";
import { WorkspaceService } from "../src/services/workspace-service.js";
import { StateStore } from "../src/store/state-store.js";

async function createServices() {
  const root = await mkdtemp(path.join(os.tmpdir(), "assistant-actions-"));
  const store = new StateStore(path.join(root, "data"));
  await store.initialize();
  const workspace = new WorkspaceService(root);
  const memories = new MemoryService(store);
  const actions = new ActionService(store, workspace, memories);
  return { actions, memories, root };
}

test("a proposed file write does nothing until approved", async () => {
  const { actions, root } = await createServices();
  const action = await actions.propose(
    "workspace_write_file",
    { path: "notes/approved.txt", content: "approved content" },
    "Test the approval boundary.",
  );

  await assert.rejects(readFile(path.join(root, "notes", "approved.txt")));
  const completed = await actions.approve(action.id);

  assert.equal(completed.status, "completed");
  assert.equal(
    await readFile(path.join(root, "notes", "approved.txt"), "utf8"),
    "approved content",
  );
});

test("rejected memory proposals are not stored", async () => {
  const { actions, memories } = await createServices();
  const action = await actions.propose(
    "remember",
    { content: "A temporary preference", category: "preference" },
    "Test rejection.",
  );

  await actions.reject(action.id);
  assert.deepEqual(memories.list(), []);
});

test("non-web browser URLs are rejected before entering the queue", async () => {
  const { actions } = await createServices();
  await assert.rejects(
    actions.propose(
      "browser_open_url",
      { url: "file:///C:/Windows/System32/calc.exe" },
      "Should never be queued.",
    ),
    /Only HTTP and HTTPS URLs/,
  );
});
