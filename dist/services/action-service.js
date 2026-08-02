import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
export class ActionService {
    store;
    workspace;
    memories;
    constructor(store, workspace, memories) {
        this.store = store;
        this.workspace = workspace;
        this.memories = memories;
    }
    list(status) {
        const actions = this.store.snapshot().actions;
        return status ? actions.filter((action) => action.status === status) : actions;
    }
    async propose(kind, arguments_, reason) {
        this.validate(kind, arguments_);
        return this.store.addAction({ kind, arguments: arguments_, reason });
    }
    async reject(id) {
        return this.store.updateAction(id, (action) => {
            if (action.status !== "pending") {
                throw new Error("Only pending actions can be rejected.");
            }
            action.status = "rejected";
        });
    }
    async approve(id) {
        const approved = await this.store.updateAction(id, (action) => {
            if (action.status !== "pending") {
                throw new Error("Only pending actions can be approved.");
            }
            action.status = "approved";
        });
        try {
            const result = await this.execute(approved);
            return await this.store.updateAction(id, (action) => {
                action.status = "completed";
                action.result = result;
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return this.store.updateAction(id, (action) => {
                action.status = "failed";
                action.error = message;
            });
        }
    }
    validate(kind, arguments_) {
        if (kind === "workspace_write_file") {
            this.requireString(arguments_, "path", 1, 500);
            this.requireString(arguments_, "content", 0, 500_000);
            return;
        }
        if (kind === "browser_open_url") {
            const url = this.requireString(arguments_, "url", 1, 2_000);
            this.parseWebUrl(url);
            return;
        }
        this.requireString(arguments_, "content", 1, 2_000);
        this.requireString(arguments_, "category", 1, 32);
    }
    async execute(action) {
        if (action.kind === "workspace_write_file") {
            const candidate = String(action.arguments.path);
            const content = String(action.arguments.content);
            const filePath = await this.workspace.resolveSafePath(candidate);
            await mkdir(path.dirname(filePath), { recursive: true });
            await writeFile(filePath, content, "utf8");
            return { path: path.relative(this.workspace.root, filePath), bytes: Buffer.byteLength(content) };
        }
        if (action.kind === "browser_open_url") {
            const url = this.parseWebUrl(String(action.arguments.url)).toString();
            if (process.platform !== "win32") {
                throw new Error("The browser launcher is currently implemented for Windows only.");
            }
            const child = spawn("rundll32.exe", ["url.dll,FileProtocolHandler", url], { detached: true, stdio: "ignore", windowsHide: true });
            child.unref();
            return { opened: url };
        }
        return this.memories.add(String(action.arguments.content), String(action.arguments.category));
    }
    requireString(object, key, minimum, maximum) {
        const value = object[key];
        if (typeof value !== "string" ||
            value.length < minimum ||
            value.length > maximum) {
            throw new Error(`${key} must be a string between ${minimum} and ${maximum} characters.`);
        }
        return value;
    }
    parseWebUrl(value) {
        const url = new URL(value);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
            throw new Error("Only HTTP and HTTPS URLs are allowed.");
        }
        return url;
    }
}
