import "dotenv/config";
import path from "node:path";
const projectRoot = path.resolve(process.cwd());
function parsePort(value) {
    const port = Number(value ?? 4317);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("PORT must be an integer from 1 to 65535.");
    }
    return port;
}
export const config = {
    host: process.env.HOST ?? "127.0.0.1",
    port: parsePort(process.env.PORT),
    openAiApiKey: process.env.OPENAI_API_KEY?.trim() || undefined,
    openAiModel: process.env.OPENAI_MODEL?.trim() || "gpt-5.6-sol",
    reasoningEffort: process.env.OPENAI_REASONING_EFFORT?.trim() || "medium",
    dataDir: path.resolve(projectRoot, process.env.DATA_DIR ?? "data"),
    workspaceRoot: path.resolve(projectRoot, process.env.WORKSPACE_ROOT ?? "."),
};
