const MEMORY_CATEGORIES = new Set([
    "preference",
    "project",
    "fact",
    "instruction",
]);
export class MemoryService {
    store;
    constructor(store) {
        this.store = store;
    }
    list() {
        return this.store.snapshot().memories;
    }
    search(query, limit = 8) {
        const terms = query
            .toLocaleLowerCase()
            .split(/\s+/)
            .map((term) => term.trim())
            .filter((term) => term.length > 1);
        return this.list()
            .map((memory) => {
            const haystack = `${memory.category} ${memory.content}`.toLocaleLowerCase();
            const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
            return { memory, score };
        })
            .filter(({ score }) => terms.length === 0 || score > 0)
            .sort((a, b) => b.score - a.score ||
            b.memory.updatedAt.localeCompare(a.memory.updatedAt))
            .slice(0, Math.max(1, Math.min(limit, 25)))
            .map(({ memory }) => memory);
    }
    async add(content, category) {
        const cleaned = content.trim();
        if (!cleaned || cleaned.length > 2_000) {
            throw new Error("Memory content must contain 1 to 2,000 characters.");
        }
        if (!MEMORY_CATEGORIES.has(category)) {
            throw new Error("Invalid memory category.");
        }
        return this.store.addMemory({
            content: cleaned,
            category: category,
        });
    }
    delete(id) {
        return this.store.deleteMemory(id);
    }
}
