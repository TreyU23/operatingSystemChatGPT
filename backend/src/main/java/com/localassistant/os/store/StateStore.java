package com.localassistant.os.store;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.localassistant.os.config.AssistantProperties;
import com.localassistant.os.model.AppState;
import com.localassistant.os.model.AssistantAction;
import com.localassistant.os.model.Conversation;
import com.localassistant.os.model.ConversationMessage;
import com.localassistant.os.model.Memory;
import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Map;
import java.util.UUID;
import java.util.function.UnaryOperator;
import org.springframework.stereotype.Component;

@Component
public class StateStore {
    private final Gson gson = new GsonBuilder().setPrettyPrinting().create();
    private final Path filePath;
    private AppState state = AppState.empty();

    public StateStore(AssistantProperties properties) {
        this.filePath = Path.of(properties.getDataDir()).toAbsolutePath().normalize().resolve("assistant-state.json");
    }

    @PostConstruct
    public synchronized void initialize() throws IOException {
        Files.createDirectories(filePath.getParent());
        if (Files.notExists(filePath)) {
            persist();
            return;
        }

        try (var reader = Files.newBufferedReader(filePath, StandardCharsets.UTF_8)) {
            AppState parsed = gson.fromJson(reader, AppState.class);
            if (parsed == null || parsed.version() != 1) {
                throw new IllegalStateException("Unsupported or invalid assistant state file.");
            }
            state = parsed;
        }
    }

    public synchronized AppState snapshot() {
        return gson.fromJson(gson.toJson(state), AppState.class);
    }

    public synchronized Conversation getOrCreateConversation(String requestedId) throws IOException {
        if (requestedId != null && !requestedId.isBlank()) {
            return state.conversations().stream()
                    .filter(conversation -> conversation.id().equals(requestedId))
                    .findFirst()
                    .orElseGet(() -> createConversation(requestedId));
        }
        return createConversation(UUID.randomUUID().toString());
    }

    private Conversation createConversation(String id) {
        String now = Instant.now().toString();
        Conversation conversation = new Conversation(id, "New conversation", new ArrayList<>(), now, now);
        var conversations = new ArrayList<>(state.conversations());
        conversations.add(conversation);
        state = new AppState(1, conversations, state.memories(), state.actions());
        persistUnchecked();
        return conversation;
    }

    public synchronized ConversationMessage addMessage(String conversationId, String role, String content)
            throws IOException {
        String now = Instant.now().toString();
        ConversationMessage message = new ConversationMessage(UUID.randomUUID().toString(), role, content, now);
        var conversations = new ArrayList<Conversation>();
        boolean found = false;
        for (Conversation conversation : state.conversations()) {
            if (!conversation.id().equals(conversationId)) {
                conversations.add(conversation);
                continue;
            }
            found = true;
            var messages = new ArrayList<>(conversation.messages());
            messages.add(message);
            String title = messages.size() == 1
                    ? content.substring(0, Math.min(72, content.length()))
                    : conversation.title();
            conversations.add(new Conversation(
                    conversation.id(), title, messages, conversation.createdAt(), now));
        }
        if (!found) {
            throw new IllegalArgumentException("Conversation not found.");
        }
        state = new AppState(1, conversations, state.memories(), state.actions());
        persist();
        return message;
    }

    public synchronized Memory addMemory(String content, String category) throws IOException {
        String now = Instant.now().toString();
        Memory memory = new Memory(UUID.randomUUID().toString(), content, category, now, now);
        var memories = new ArrayList<>(state.memories());
        memories.add(memory);
        state = new AppState(1, state.conversations(), memories, state.actions());
        persist();
        return memory;
    }

    public synchronized boolean deleteMemory(String id) throws IOException {
        var memories = new ArrayList<>(state.memories());
        boolean deleted = memories.removeIf(memory -> memory.id().equals(id));
        if (deleted) {
            state = new AppState(1, state.conversations(), memories, state.actions());
            persist();
        }
        return deleted;
    }

    public synchronized AssistantAction addAction(
            String kind, Map<String, Object> arguments, String reason) throws IOException {
        String now = Instant.now().toString();
        AssistantAction action = new AssistantAction(
                UUID.randomUUID().toString(), kind, "pending", Map.copyOf(arguments), reason,
                null, null, now, now);
        var actions = new ArrayList<>(state.actions());
        actions.add(action);
        state = new AppState(1, state.conversations(), state.memories(), actions);
        persist();
        return action;
    }

    public synchronized AssistantAction updateAction(String id, UnaryOperator<AssistantAction> update)
            throws IOException {
        var actions = new ArrayList<AssistantAction>();
        AssistantAction updated = null;
        for (AssistantAction action : state.actions()) {
            if (action.id().equals(id)) {
                updated = update.apply(action);
                updated = new AssistantAction(
                        updated.id(), updated.kind(), updated.status(), updated.arguments(), updated.reason(),
                        updated.result(), updated.error(), updated.createdAt(), Instant.now().toString());
                actions.add(updated);
            } else {
                actions.add(action);
            }
        }
        if (updated == null) {
            throw new IllegalArgumentException("Action not found.");
        }
        state = new AppState(1, state.conversations(), state.memories(), actions);
        persist();
        return updated;
    }

    private void persistUnchecked() {
        try {
            persist();
        } catch (IOException error) {
            throw new IllegalStateException("Could not persist assistant state.", error);
        }
    }

    private void persist() throws IOException {
        Path temporary = filePath.resolveSibling(filePath.getFileName() + ".tmp");
        Files.writeString(temporary, gson.toJson(state), StandardCharsets.UTF_8);
        try {
            Files.move(temporary, filePath, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        } catch (AtomicMoveNotSupportedException ignored) {
            Files.move(temporary, filePath, StandardCopyOption.REPLACE_EXISTING);
        }
    }
}
