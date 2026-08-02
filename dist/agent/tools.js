export const assistantTools = [
    {
        type: "function",
        name: "list_workspace_files",
        description: "List files inside the configured project workspace. This is read-only.",
        strict: true,
        parameters: {
            type: "object",
            properties: {
                subdirectory: { type: "string", description: "Workspace-relative directory, or . for the root." },
                limit: { type: "integer", minimum: 1, maximum: 500 },
            },
            required: ["subdirectory", "limit"],
            additionalProperties: false,
        },
    },
    {
        type: "function",
        name: "read_workspace_file",
        description: "Read a UTF-8 text file of at most 100 KB from inside the workspace.",
        strict: true,
        parameters: {
            type: "object",
            properties: { path: { type: "string" } },
            required: ["path"],
            additionalProperties: false,
        },
    },
    {
        type: "function",
        name: "recall_memory",
        description: "Search memories the user previously chose to store.",
        strict: true,
        parameters: {
            type: "object",
            properties: {
                query: { type: "string" },
                limit: { type: "integer", minimum: 1, maximum: 25 },
            },
            required: ["query", "limit"],
            additionalProperties: false,
        },
    },
    {
        type: "function",
        name: "propose_write_file",
        description: "Propose writing a file in the workspace. This queues an action and never writes without user approval.",
        strict: true,
        parameters: {
            type: "object",
            properties: {
                path: { type: "string" },
                content: { type: "string" },
                reason: { type: "string" },
            },
            required: ["path", "content", "reason"],
            additionalProperties: false,
        },
    },
    {
        type: "function",
        name: "propose_open_url",
        description: "Propose opening an HTTP(S) URL in the user's default Windows browser. Requires approval.",
        strict: true,
        parameters: {
            type: "object",
            properties: {
                url: { type: "string" },
                reason: { type: "string" },
            },
            required: ["url", "reason"],
            additionalProperties: false,
        },
    },
    {
        type: "function",
        name: "propose_memory",
        description: "Propose a durable memory. Use only for useful user facts or preferences; saving requires approval.",
        strict: true,
        parameters: {
            type: "object",
            properties: {
                content: { type: "string" },
                category: { type: "string", enum: ["preference", "project", "fact", "instruction"] },
                reason: { type: "string" },
            },
            required: ["content", "category", "reason"],
            additionalProperties: false,
        },
    },
];
export async function callAssistantTool(name, args, dependencies) {
    if (name === "list_workspace_files") {
        return dependencies.workspace.listFiles(String(args.subdirectory), Number(args.limit));
    }
    if (name === "read_workspace_file") {
        return dependencies.workspace.readTextFile(String(args.path));
    }
    if (name === "recall_memory") {
        return dependencies.memories.search(String(args.query), Number(args.limit));
    }
    if (name === "propose_write_file") {
        return dependencies.actions.propose("workspace_write_file", { path: args.path, content: args.content }, String(args.reason));
    }
    if (name === "propose_open_url") {
        return dependencies.actions.propose("browser_open_url", { url: args.url }, String(args.reason));
    }
    if (name === "propose_memory") {
        return dependencies.actions.propose("remember", { content: args.content, category: args.category }, String(args.reason));
    }
    throw new Error(`Unknown assistant tool: ${name}`);
}
