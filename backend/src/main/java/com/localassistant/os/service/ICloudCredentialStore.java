package com.localassistant.os.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.localassistant.os.config.AssistantProperties;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
public class ICloudCredentialStore {
    private static final Duration COMMAND_TIMEOUT = Duration.ofSeconds(12);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Path credentialFile;

    public ICloudCredentialStore(AssistantProperties properties) {
        credentialFile = Path.of(properties.getDataDir()).toAbsolutePath().normalize()
                .resolve("icloud-calendar-credentials.json");
    }

    public synchronized void save(String email, String appSpecificPassword) throws IOException {
        Files.createDirectories(credentialFile.getParent());
        String protectedPassword = protect(appSpecificPassword);
        objectMapper.writeValue(credentialFile.toFile(), Map.of(
                "email", email.trim(),
                "protectedPassword", protectedPassword));
    }

    public synchronized Optional<Credentials> load() {
        if (Files.notExists(credentialFile)) return Optional.empty();
        try {
            @SuppressWarnings("unchecked")
            Map<String, String> saved = objectMapper.readValue(credentialFile.toFile(), Map.class);
            String email = saved.getOrDefault("email", "").trim();
            String encrypted = saved.getOrDefault("protectedPassword", "").trim();
            if (email.isBlank() || encrypted.isBlank()) return Optional.empty();
            return Optional.of(new Credentials(email, unprotect(encrypted)));
        } catch (Exception ignored) {
            return Optional.empty();
        }
    }

    public synchronized void clear() throws IOException {
        Files.deleteIfExists(credentialFile);
    }

    private String protect(String value) throws IOException {
        String script = "Add-Type -AssemblyName System.Security;"
                + "$v=[Console]::In.ReadToEnd();"
                + "$b=[Text.Encoding]::UTF8.GetBytes($v);"
                + "$p=[System.Security.Cryptography.ProtectedData]::Protect($b,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser);"
                + "[Console]::Out.Write([Convert]::ToBase64String($p))";
        return runPowerShell(script, value);
    }

    private String unprotect(String value) throws IOException {
        String script = "Add-Type -AssemblyName System.Security;"
                + "$v=[Console]::In.ReadToEnd();"
                + "$b=[Convert]::FromBase64String($v);"
                + "$p=[System.Security.Cryptography.ProtectedData]::Unprotect($b,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser);"
                + "[Console]::Out.Write([Text.Encoding]::UTF8.GetString($p))";
        return runPowerShell(script, value);
    }

    private String runPowerShell(String script, String input) throws IOException {
        Process process = new ProcessBuilder(
                        "powershell.exe", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", script)
                .redirectErrorStream(false)
                .start();
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
        if (process.exitValue() != 0 || output.isBlank()) {
            throw new IOException(error.isBlank() ? "Windows credential protection failed." : error);
        }
        return output;
    }

    public record Credentials(String email, String appSpecificPassword) {}
}
