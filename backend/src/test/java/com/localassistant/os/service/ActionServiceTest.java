package com.localassistant.os.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.localassistant.os.config.AssistantProperties;
import com.localassistant.os.store.StateStore;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class ActionServiceTest {
    @TempDir
    Path root;

    private ActionService actions;
    private MemoryService memories;

    @BeforeEach
    void setUp() throws Exception {
        AssistantProperties properties = new AssistantProperties();
        properties.setDataDir(root.resolve("data"));
        properties.setWorkspaceRoot(root);
        StateStore store = new StateStore(properties);
        store.initialize();
        WorkspaceService workspace = new WorkspaceService(properties);
        memories = new MemoryService(store);
        actions = new ActionService(store, workspace, memories);
    }

    @Test
    void proposedWritesDoNothingUntilApproved() throws Exception {
        var action = actions.propose(
                "workspace_write_file",
                Map.of("path", "notes/approved.txt", "content", "approved content"),
                "Test approval.");

        assertThat(root.resolve("notes/approved.txt")).doesNotExist();
        assertThat(actions.approve(action.id()).status()).isEqualTo("completed");
        assertThat(Files.readString(root.resolve("notes/approved.txt"))).isEqualTo("approved content");
    }

    @Test
    void rejectedMemoryIsNotStored() throws Exception {
        var action = actions.propose(
                "remember",
                Map.of("content", "Temporary", "category", "preference"),
                "Test rejection.");
        actions.reject(action.id());
        assertThat(memories.list()).isEmpty();
    }

    @Test
    void nonWebUrlsAreRejectedBeforeQueueing() {
        assertThatThrownBy(() -> actions.propose(
                "browser_open_url",
                Map.of("url", "file:///C:/Windows/System32/calc.exe"),
                "Should not queue."))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Only HTTP and HTTPS");
    }
}
