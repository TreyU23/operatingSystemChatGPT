package com.localassistant.os.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.localassistant.os.profile.ProfilePaths;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
public class ProfileCredentialStore {
    private static final Duration COMMAND_TIMEOUT = Duration.ofSeconds(12);
    private final ObjectMapper mapper = new ObjectMapper();
    private final ProfilePaths profilePaths;

    public ProfileCredentialStore(ProfilePaths profilePaths) { this.profilePaths = profilePaths; }

    public synchronized void saveOpenAiKey(String apiKey) throws IOException {
        String cleaned = apiKey == null ? "" : apiKey.trim();
        if (!cleaned.startsWith("sk-") || cleaned.length() < 20) {
            throw new IllegalArgumentException("Enter a valid OpenAI API key.");
        }
        Path file = profilePaths.file("openai-credentials.json");
        Files.createDirectories(file.getParent());
        mapper.writeValue(file.toFile(), Map.of("protectedApiKey", protect(cleaned)));
    }

    public synchronized Optional<String> loadOpenAiKey() {
        Path file = profilePaths.file("openai-credentials.json");
        if (Files.notExists(file)) return Optional.empty();
        try {
            @SuppressWarnings("unchecked") Map<String, String> saved = mapper.readValue(file.toFile(), Map.class);
            String encrypted = saved.getOrDefault("protectedApiKey", "");
            return encrypted.isBlank() ? Optional.empty() : Optional.of(unprotect(encrypted));
        } catch (Exception ignored) { return Optional.empty(); }
    }

    public synchronized void clearOpenAiKey() throws IOException {
        Files.deleteIfExists(profilePaths.file("openai-credentials.json"));
    }

    private String protect(String value) throws IOException {
        return runPowerShell("Add-Type -AssemblyName System.Security;$v=[Console]::In.ReadToEnd();$b=[Text.Encoding]::UTF8.GetBytes($v);$p=[System.Security.Cryptography.ProtectedData]::Protect($b,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Out.Write([Convert]::ToBase64String($p))", value);
    }

    private String unprotect(String value) throws IOException {
        return runPowerShell("Add-Type -AssemblyName System.Security;$v=[Console]::In.ReadToEnd();$b=[Convert]::FromBase64String($v);$p=[System.Security.Cryptography.ProtectedData]::Unprotect($b,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Out.Write([Text.Encoding]::UTF8.GetString($p))", value);
    }

    private String runPowerShell(String script, String input) throws IOException {
        Process process = new ProcessBuilder("powershell.exe", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", script).start();
        process.getOutputStream().write(input.getBytes(StandardCharsets.UTF_8));
        process.getOutputStream().close();
        try {
            if (!process.waitFor(COMMAND_TIMEOUT.toMillis(), java.util.concurrent.TimeUnit.MILLISECONDS)) {
                process.destroyForcibly();
                throw new IOException("Windows credential protection timed out.");
            }
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw new IOException("Windows credential protection was interrupted.", error);
        }
        String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8).trim();
        String error = new String(process.getErrorStream().readAllBytes(), StandardCharsets.UTF_8).trim();
        if (process.exitValue() != 0 || output.isBlank()) throw new IOException(error.isBlank() ? "Windows credential protection failed." : error);
        return output;
    }
}
