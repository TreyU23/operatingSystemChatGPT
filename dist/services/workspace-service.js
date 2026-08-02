import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
const IGNORED_DIRECTORIES = new Set([".git", "node_modules", "dist"]);
export class WorkspaceService {
    root;
    constructor(root) {
        this.root = path.resolve(root);
    }
    async resolveSafePath(candidate = ".") {
        const absolute = path.resolve(this.root, candidate);
        const relative = path.relative(this.root, absolute);
        if (relative.startsWith("..") || path.isAbsolute(relative)) {
            throw new Error("Path is outside the configured workspace.");
        }
        let cursor = this.root;
        for (const segment of relative.split(path.sep).filter(Boolean)) {
            cursor = path.join(cursor, segment);
            try {
                const stats = await lstat(cursor);
                if (stats.isSymbolicLink()) {
                    throw new Error("Symbolic links are not allowed in workspace actions.");
                }
            }
            catch (error) {
                if (error.code === "ENOENT")
                    break;
                throw error;
            }
        }
        return absolute;
    }
    async readTextFile(candidate) {
        const filePath = await this.resolveSafePath(candidate);
        const stats = await lstat(filePath);
        if (!stats.isFile())
            throw new Error("Requested path is not a file.");
        if (stats.size > 100_000) {
            throw new Error("File is larger than the 100 KB read limit.");
        }
        return {
            path: path.relative(this.root, filePath) || ".",
            content: await readFile(filePath, "utf8"),
        };
    }
    async listFiles(subdirectory = ".", limit = 200) {
        const start = await this.resolveSafePath(subdirectory);
        const results = [];
        const maximum = Math.max(1, Math.min(limit, 500));
        const visit = async (directory) => {
            if (results.length >= maximum)
                return;
            const entries = await readdir(directory, { withFileTypes: true });
            entries.sort((a, b) => a.name.localeCompare(b.name));
            for (const entry of entries) {
                if (results.length >= maximum)
                    break;
                if (entry.isSymbolicLink())
                    continue;
                const absolute = path.join(directory, entry.name);
                if (entry.isDirectory()) {
                    if (!IGNORED_DIRECTORIES.has(entry.name))
                        await visit(absolute);
                }
                else if (entry.isFile()) {
                    results.push(path.relative(this.root, absolute));
                }
            }
        };
        await visit(start);
        return results;
    }
}
