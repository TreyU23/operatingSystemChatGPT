import Fastify from "fastify";
import { OpenAiAgent } from "./agent/openai-agent.js";
import { config } from "./config.js";
import { ActionService } from "./services/action-service.js";
import { MemoryService } from "./services/memory-service.js";
import { WorkspaceService } from "./services/workspace-service.js";
import { StateStore } from "./store/state-store.js";
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
export async function buildApp(options = {}) {
    const app = Fastify({ logger: options.logger ?? true, bodyLimit: 600_000 });
    const store = new StateStore(options.dataDir ?? config.dataDir);
    await store.initialize();
    const workspace = new WorkspaceService(options.workspaceRoot ?? config.workspaceRoot);
    const memories = new MemoryService(store);
    const actions = new ActionService(store, workspace, memories);
    const agent = new OpenAiAgent({
        apiKey: options.apiKey ?? config.openAiApiKey,
        model: config.openAiModel,
        reasoningEffort: config.reasoningEffort,
        actions,
        memories,
        workspace,
    });
    app.get("/health", async () => ({
        status: "ok",
        openAiConfigured: agent.configured,
        workspaceRoot: workspace.root,
    }));
    app.get("/api/conversations", async () => store.snapshot().conversations.map(({ messages, ...conversation }) => ({
        ...conversation,
        messageCount: messages.length,
    })));
    app.get("/api/conversations/:id", async (request, reply) => {
        const conversation = store.snapshot().conversations.find((item) => item.id === request.params.id);
        if (!conversation)
            return reply.code(404).send({ error: "Conversation not found." });
        return conversation;
    });
    app.post("/api/chat", async (request, reply) => {
        const message = request.body?.message?.trim();
        if (!message || message.length > 20_000) {
            return reply.code(400).send({ error: "message must contain 1 to 20,000 characters." });
        }
        if (!agent.configured) {
            return reply.code(503).send({ error: "OPENAI_API_KEY is not configured." });
        }
        try {
            const conversation = await store.getOrCreateConversation(request.body.conversationId);
            await store.addMessage(conversation.id, { role: "user", content: message });
            const current = store.snapshot().conversations.find((item) => item.id === conversation.id);
            const content = await agent.reply(current);
            const assistantMessage = await store.addMessage(conversation.id, {
                role: "assistant",
                content,
            });
            return { conversationId: conversation.id, message: assistantMessage };
        }
        catch (error) {
            request.log.error(error);
            return reply.code(502).send({ error: errorMessage(error) });
        }
    });
    app.get("/api/actions", async (request) => actions.list(request.query.status));
    app.post("/api/actions/:id/approve", async (request, reply) => {
        try {
            return await actions.approve(request.params.id);
        }
        catch (error) {
            return reply.code(400).send({ error: errorMessage(error) });
        }
    });
    app.post("/api/actions/:id/reject", async (request, reply) => {
        try {
            return await actions.reject(request.params.id);
        }
        catch (error) {
            return reply.code(400).send({ error: errorMessage(error) });
        }
    });
    app.get("/api/memories", async () => memories.list());
    app.post("/api/memories", async (request, reply) => {
        try {
            return reply.code(201).send(await memories.add(request.body?.content ?? "", request.body?.category ?? ""));
        }
        catch (error) {
            return reply.code(400).send({ error: errorMessage(error) });
        }
    });
    app.delete("/api/memories/:id", async (request, reply) => {
        const deleted = await memories.delete(request.params.id);
        return deleted ? reply.code(204).send() : reply.code(404).send({ error: "Memory not found." });
    });
    return app;
}
