package com.localassistant.os.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.localassistant.os.config.AssistantProperties;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import org.springframework.stereotype.Service;

@Service
public class WindowsMediaSessionService {
    private static final Duration COMMAND_TIMEOUT = Duration.ofSeconds(12);
    private static final Set<String> ACTIONS = Set.of("snapshot", "play", "pause", "next", "previous", "shuffle", "mute");
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Path workspaceRoot;
    private final Path script;

    public WindowsMediaSessionService(AssistantProperties properties) {
        workspaceRoot = Path.of(properties.getWorkspaceRoot()).toAbsolutePath().normalize();
        script = workspaceRoot.resolve("scripts").resolve("windows-media-session.ps1").normalize();
    }

    public Map<String, Object> snapshot() {
        return snapshot("music");
    }

    public Map<String, Object> snapshot(String provider) {
        return invoke("snapshot", normalizeProvider(provider));
    }

    public Map<String, Object> control(String action) {
        return control(action, "music");
    }

    public Map<String, Object> control(String action, String provider) {
        String normalized = action == null ? "" : action.trim().toLowerCase();
        if (!ACTIONS.contains(normalized) || normalized.equals("snapshot")) {
            throw new IllegalArgumentException("Media action must be play, pause, next, previous, shuffle, or mute.");
        }
        return invoke(normalized, normalizeProvider(provider));
    }

    private String normalizeProvider(String provider) {
        String normalized = provider == null ? "music" : provider.trim().toLowerCase();
        if (!Set.of("apple", "spotify", "music").contains(normalized)) {
            throw new IllegalArgumentException("Music provider must be apple or spotify.");
        }
        return normalized;
    }

    private Map<String, Object> invoke(String action, String provider) {
        if (!System.getProperty("os.name", "").toLowerCase().contains("windows")) return unavailable(provider, "Windows media controls are available on Windows only.");
        if (!script.startsWith(workspaceRoot) || !Files.isRegularFile(script)) return unavailable(provider, "The local media-control script is unavailable.");
        try {
            Process process = new ProcessBuilder(
                            "powershell.exe", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden",
                            "-ExecutionPolicy", "Bypass", "-File", script.toString(), "-Action", action, "-Provider", provider)
                    .redirectErrorStream(false)
                    .start();
            if (!process.waitFor(COMMAND_TIMEOUT.toMillis(), TimeUnit.MILLISECONDS)) {
                process.destroyForcibly();
                return unavailable(provider, "Windows media controls timed out.");
            }
            String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8).trim();
            String error = new String(process.getErrorStream().readAllBytes(), StandardCharsets.UTF_8).trim();
            if (process.exitValue() != 0 || output.isBlank()) {
                return unavailable(provider, error.isBlank() ? "Windows media controls did not return a result." : error);
            }
            return objectMapper.readValue(output, new TypeReference<>() {});
        } catch (Exception error) {
            return unavailable(provider, error.getMessage() == null ? error.toString() : error.getMessage());
        }
    }

    private Map<String, Object> unavailable(String provider, String detail) {
        String providerName = provider.equals("apple") ? "Apple Music" : provider.equals("spotify") ? "Spotify" : "Music";
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("available", false);
        result.put("ready", false);
        result.put("playing", false);
        result.put("title", "Nothing playing");
        result.put("artist", providerName);
        result.put("album", "Start a track in " + providerName + " or the web player");
        result.put("artwork", "/assets/album-cover.png");
        result.put("elapsed", 0);
        result.put("duration", 0);
        result.put("shuffled", false);
        result.put("detail", detail);
        return result;
    }
}
