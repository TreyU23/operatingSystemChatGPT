package com.localassistant.os.service;

import com.localassistant.os.config.AssistantProperties;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class RuntimeService {
    private static final int FRONTEND_PORT = 4173;
    private static final int BACKEND_PORT = 4317;

    private final Path workspaceRoot;
    private final Path lifecycleScript;
    private final Path lifecycleLog;

    public RuntimeService(AssistantProperties properties) {
        workspaceRoot = Path.of(properties.getWorkspaceRoot()).toAbsolutePath().normalize();
        lifecycleScript = workspaceRoot.resolve("scripts").resolve("project-lifecycle.ps1").normalize();
        lifecycleLog = workspaceRoot.resolve("data").resolve("runtime-control.log").normalize();
    }

    public RuntimeStatus status() {
        return new RuntimeStatus(
                true,
                listening(FRONTEND_PORT),
                ProcessHandle.current().pid(),
                Instant.now().toString());
    }

    public LifecycleRequest request(String action) throws IOException {
        String normalized = action == null ? "" : action.trim().toLowerCase(Locale.ROOT);
        if (!normalized.equals("restart") && !normalized.equals("shutdown")) {
            throw new IllegalArgumentException("Lifecycle action must be restart or shutdown.");
        }
        if (!System.getProperty("os.name", "").toLowerCase(Locale.ROOT).contains("windows")) {
            throw new IllegalStateException("Project lifecycle controls are available on Windows only.");
        }
        if (!lifecycleScript.startsWith(workspaceRoot) || !Files.isRegularFile(lifecycleScript)) {
            throw new IllegalStateException("Project lifecycle script is unavailable.");
        }

        Files.createDirectories(lifecycleLog.getParent());
        ProcessBuilder builder = new ProcessBuilder(
                "powershell.exe",
                "-NoProfile",
                "-NonInteractive",
                "-WindowStyle",
                "Hidden",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                lifecycleScript.toString(),
                "-Action",
                normalized,
                "-WorkspaceRoot",
                workspaceRoot.toString());
        builder.directory(workspaceRoot.toFile());
        builder.redirectOutput(ProcessBuilder.Redirect.appendTo(lifecycleLog.toFile()));
        builder.redirectError(ProcessBuilder.Redirect.appendTo(lifecycleLog.toFile()));
        builder.start();

        return new LifecycleRequest(normalized, "accepted", Instant.now().toString());
    }

    private boolean listening(int port) {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress("127.0.0.1", port), 250);
            return true;
        } catch (IOException ignored) {
            return false;
        }
    }

    public record RuntimeStatus(boolean backendOnline, boolean frontendOnline, long backendPid, String capturedAt) {}

    public record LifecycleRequest(String action, String status, String acceptedAt) {}
}
