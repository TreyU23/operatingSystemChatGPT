import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
const EMPTY_STATE = {
    version: 1,
    conversations: [],
    memories: [],
    actions: [],
};
export class StateStore {
    filePath;
    state = structuredClone(EMPTY_STATE);
    mutationQueue = Promise.resolve();
    constructor(dataDir) {
        this.filePath = path.join(dataDir, "assistant-state.json");
    }
    async initialize() {
        await mkdir(path.dirname(this.filePath), { recursive: true });
        try {
            const raw = await readFile(this.filePath, "utf8");
            const parsed = JSON.parse(raw);
            if (parsed.version !== 1) {
                throw new Error(`Unsupported state version: ${String(parsed.version)}`);
            }
            this.state = parsed;
        }
        catch (error) {
            if (error.code !== "ENOENT") {
                throw error;
            }
            await this.persist();
        }
    }
    snapshot() {
        return structuredClone(this.state);
    }
    async mutate(operation) {
        let result;
        const queued = this.mutationQueue.then(async () => {
            const draft = structuredClone(this.state);
            result = operation(draft);
            this.state = draft;
            await this.persist();
        });
        this.mutationQueue = queued.catch(() => undefined);
        await queued;
        return structuredClone(result);
    }
    async getOrCreateConversation(id) {
        return this.mutate((state) => {
            const existing = id
                ? state.conversations.find((conversation) => conversation.id === id)
                : undefined;
            if (existing)
                return existing;
            const now = new Date().toISOString();
            const conversation = {
                id: id ?? randomUUID(),
                title: "New conversation",
                messages: [],
                createdAt: now,
                updatedAt: now,
            };
            state.conversations.push(conversation);
            return conversation;
        });
    }
    async addMessage(conversationId, message) {
        return this.mutate((state) => {
            const conversation = state.conversations.find((item) => item.id === conversationId);
            if (!conversation)
                throw new Error("Conversation not found.");
            const created = {
                id: randomUUID(),
                ...message,
                createdAt: new Date().toISOString(),
            };
            conversation.messages.push(created);
            conversation.updatedAt = created.createdAt;
            if (conversation.messages.length === 1) {
                conversation.title = message.content.slice(0, 72) || "New conversation";
            }
            return created;
        });
    }
    async addMemory(memory) {
        return this.mutate((state) => {
            const now = new Date().toISOString();
            const created = {
                id: randomUUID(),
                ...memory,
                createdAt: now,
                updatedAt: now,
            };
            state.memories.push(created);
            return created;
        });
    }
    async deleteMemory(id) {
        return this.mutate((state) => {
            const before = state.memories.length;
            state.memories = state.memories.filter((memory) => memory.id !== id);
            return state.memories.length !== before;
        });
    }
    async addAction(action) {
        return this.mutate((state) => {
            const now = new Date().toISOString();
            const created = {
                id: randomUUID(),
                ...action,
                status: "pending",
                createdAt: now,
                updatedAt: now,
            };
            state.actions.push(created);
            return created;
        });
    }
    async updateAction(id, update) {
        return this.mutate((state) => {
            const action = state.actions.find((item) => item.id === id);
            if (!action)
                throw new Error("Action not found.");
            update(action);
            action.updatedAt = new Date().toISOString();
            return action;
        });
    }
    async persist() {
        const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
        await writeFile(temporaryPath, JSON.stringify(this.state, null, 2), "utf8");
        await rename(temporaryPath, this.filePath);
    }
}
