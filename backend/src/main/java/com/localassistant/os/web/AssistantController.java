package com.localassistant.os.web;

import com.localassistant.os.agent.OpenAiAgent;
import com.localassistant.os.config.AssistantProperties;
import com.localassistant.os.model.Conversation;
import com.localassistant.os.model.ConversationMessage;
import com.localassistant.os.service.ActionService;
import com.localassistant.os.service.MemoryService;
import com.localassistant.os.service.WorkspaceService;
import com.localassistant.os.store.StateStore;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.io.IOException;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AssistantController {
    private final StateStore store;
    private final OpenAiAgent agent;
    private final ActionService actions;
    private final MemoryService memories;
    private final WorkspaceService workspace;
    private final AssistantProperties properties;

    public AssistantController(
            StateStore store,
            OpenAiAgent agent,
            ActionService actions,
            MemoryService memories,
            WorkspaceService workspace,
            AssistantProperties properties) {
        this.store = store;
        this.agent = agent;
        this.actions = actions;
        this.memories = memories;
        this.workspace = workspace;
        this.properties = properties;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of(
                "status", "ok",
                "openAiConfigured", agent.configured(),
                "workspaceRoot", workspace.root().toString());
    }

    @GetMapping("/api/conversations")
    public Object conversations() {
        return store.snapshot().conversations().stream()
                .map(conversation -> Map.of(
                        "id", conversation.id(),
                        "title", conversation.title(),
                        "createdAt", conversation.createdAt(),
                        "updatedAt", conversation.updatedAt(),
                        "messageCount", conversation.messages().size()))
                .toList();
    }

    @GetMapping("/api/conversations/{id}")
    public ResponseEntity<?> conversation(@PathVariable String id) {
        return store.snapshot().conversations().stream()
                .filter(item -> item.id().equals(id))
                .findFirst()
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Conversation not found.")));
    }

    @PostMapping("/api/chat")
    public ResponseEntity<?> chat(@Valid @RequestBody ChatRequest request) {
        if (!agent.configured()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "OPENAI_API_KEY is not configured."));
        }
        try {
            Conversation conversation = store.getOrCreateConversation(request.conversationId());
            store.addMessage(conversation.id(), "user", request.message().trim());
            Conversation current = store.snapshot().conversations().stream()
                    .filter(item -> item.id().equals(conversation.id()))
                    .findFirst()
                    .orElseThrow();
            ConversationMessage message = store.addMessage(
                    conversation.id(), "assistant", agent.reply(current));
            return ResponseEntity.ok(Map.of("conversationId", conversation.id(), "message", message));
        } catch (Exception error) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(error(error));
        }
    }

    @GetMapping("/api/actions")
    public Object actions(@RequestParam(required = false) String status) {
        return actions.list(status);
    }

    @PostMapping("/api/actions/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable String id) {
        try {
            return ResponseEntity.ok(actions.approve(id));
        } catch (Exception error) {
            return ResponseEntity.badRequest().body(error(error));
        }
    }

    @PostMapping("/api/actions/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable String id) {
        try {
            return ResponseEntity.ok(actions.reject(id));
        } catch (Exception error) {
            return ResponseEntity.badRequest().body(error(error));
        }
    }

    @GetMapping("/api/memories")
    public Object memories() {
        return memories.list();
    }

    @PostMapping("/api/memories")
    public ResponseEntity<?> createMemory(@RequestBody MemoryRequest request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(memories.add(request.content(), request.category()));
        } catch (Exception error) {
            return ResponseEntity.badRequest().body(error(error));
        }
    }

    @DeleteMapping("/api/memories/{id}")
    public ResponseEntity<?> deleteMemory(@PathVariable String id) throws IOException {
        return memories.delete(id)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Memory not found."));
    }

    private Map<String, String> error(Exception error) {
        String message = error.getMessage() == null ? error.toString() : error.getMessage();
        return Map.of("error", message);
    }

    public record ChatRequest(
            String conversationId,
            @NotBlank @Size(max = 20_000) String message) {}

    public record MemoryRequest(String content, String category) {}
}
