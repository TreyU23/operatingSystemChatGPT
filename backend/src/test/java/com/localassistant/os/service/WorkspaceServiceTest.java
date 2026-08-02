package com.localassistant.os.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.localassistant.os.config.AssistantProperties;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class WorkspaceServiceTest {
    @TempDir
    Path root;

    @Test
    void pathsCannotEscapeTheConfiguredRoot() {
        WorkspaceService workspace = workspace();
        assertThatThrownBy(() -> workspace.resolveSafePath("../outside.txt"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("outside the configured workspace");
    }

    @Test
    void fileListingAndReadingStayLocal() throws Exception {
        Files.createDirectories(root.resolve("notes"));
        Files.writeString(root.resolve("notes/hello.txt"), "hello");
        WorkspaceService workspace = workspace();

        assertThat(workspace.listFiles(".", 200)).containsExactly(Path.of("notes/hello.txt").toString());
        assertThat(workspace.readTextFile("notes/hello.txt"))
                .isEqualTo(new WorkspaceService.FileContents(Path.of("notes/hello.txt").toString(), "hello"));
    }

    private WorkspaceService workspace() {
        AssistantProperties properties = new AssistantProperties();
        properties.setWorkspaceRoot(root.toString());
        return new WorkspaceService(properties);
    }
}
