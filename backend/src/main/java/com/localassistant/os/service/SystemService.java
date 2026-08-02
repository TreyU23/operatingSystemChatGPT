package com.localassistant.os.service;

import com.localassistant.os.config.AssistantProperties;
import com.sun.management.OperatingSystemMXBean;
import java.io.File;
import java.lang.management.ManagementFactory;
import java.net.NetworkInterface;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class SystemService {
    private static final Map<String, ControlDefinition> CONTROL_DEFINITIONS = Map.of(
            "wifi", new ControlDefinition("wifi", "Wi-Fi", "ms-settings:network-wifi"),
            "bluetooth", new ControlDefinition("bluetooth", "Bluetooth", "ms-settings:bluetooth"),
            "focus", new ControlDefinition("focus", "Focus", "ms-settings:quiethours"),
            "night-light", new ControlDefinition("night-light", "Night light", "ms-settings:nightlight"),
            "microphone", new ControlDefinition("microphone", "Mic privacy", "ms-settings:privacy-microphone"),
            "battery-saver", new ControlDefinition("battery-saver", "Battery saver", "ms-settings:batterysaver"));

    private static final Map<String, AppDefinition> KNOWN_APPS = Map.ofEntries(
            Map.entry("code", new AppDefinition("Visual Studio Code", "Working in your local workspace", "code")),
            Map.entry("figma", new AppDefinition("Figma", "Design workspace", "figma")),
            Map.entry("msedge", new AppDefinition("Microsoft Edge", "Browser active", "edge")),
            Map.entry("chrome", new AppDefinition("Google Chrome", "Browser active", "chrome")),
            Map.entry("excel", new AppDefinition("Microsoft Excel", "Spreadsheet active", "excel")),
            Map.entry("powerpnt", new AppDefinition("Microsoft PowerPoint", "Presentation active", "powerpoint")),
            Map.entry("applemusic", new AppDefinition("Apple Music", "Audio app active", "apple-music")),
            Map.entry("slack", new AppDefinition("Slack", "Workspace active", "slack")),
            Map.entry("teams", new AppDefinition("Microsoft Teams", "Collaboration active", "teams")));

    private final Path workspaceRoot;

    public SystemService(AssistantProperties properties) {
        workspaceRoot = Path.of(properties.getWorkspaceRoot()).toAbsolutePath().normalize();
    }

    public SystemSnapshot snapshot() {
        OperatingSystemMXBean osBean = (OperatingSystemMXBean) ManagementFactory.getOperatingSystemMXBean();
        long totalMemory = Math.max(0, osBean.getTotalMemorySize());
        long freeMemory = Math.max(0, osBean.getFreeMemorySize());
        double cpuLoad = Math.max(0, osBean.getCpuLoad());
        File disk = Optional.ofNullable(workspaceRoot.toFile().toPath().getRoot())
                .map(Path::toFile)
                .orElse(workspaceRoot.toFile());
        NetworkInfo network = networkInfo();

        return new SystemSnapshot(
                Instant.now().toString(),
                new HostInfo(
                        environment("COMPUTERNAME", "This device"),
                        System.getProperty("user.name", "Local user"),
                        System.getProperty("os.name", "Windows"),
                        System.getProperty("os.version", "Unknown"),
                        System.getProperty("os.arch", "Unknown"),
                        Runtime.version().feature()),
                new ResourceInfo(
                        Math.round(cpuLoad * 100),
                        totalMemory - freeMemory,
                        totalMemory,
                        Math.max(0, disk.getTotalSpace() - disk.getUsableSpace()),
                        Math.max(0, disk.getTotalSpace()),
                        network,
                        batteryInfo()),
                controls(network));
    }

    public List<RunningApp> runningApps() {
        Map<String, RunningApp> found = new LinkedHashMap<>();
        ProcessHandle.allProcesses().forEach(process -> {
            String command = process.info().command().orElse("");
            if (command.isBlank()) {
                return;
            }
            String filename = Path.of(command).getFileName().toString().toLowerCase(Locale.ROOT);
            int extension = filename.lastIndexOf('.');
            String key = extension > 0 ? filename.substring(0, extension) : filename;
            AppDefinition definition = KNOWN_APPS.get(key);
            if (definition != null) {
                found.putIfAbsent(key, new RunningApp(
                        key, definition.name(), definition.detail(), definition.icon(), true));
            }
        });
        return found.values().stream()
                .sorted(Comparator.comparing(RunningApp::name))
                .limit(6)
                .toList();
    }

    public PhoneLinkInfo phoneLink() {
        boolean windows = isWindows();
        Path packagePath = Path.of(environment("LOCALAPPDATA", "."), "Packages", "Microsoft.YourPhone_8wekyb3d8bbwe");
        boolean installed = windows && Files.isDirectory(packagePath);
        boolean running = ProcessHandle.allProcesses().anyMatch(process ->
                process.info().command().orElse("").toLowerCase(Locale.ROOT).contains("phoneexperiencehost"));
        return new PhoneLinkInfo(
                installed,
                running,
                installed ? (running ? "Connected app is running" : "Ready to open") : "Phone Link is not installed",
                "ms-phone:");
    }

    public ControlDefinition control(String id) {
        ControlDefinition definition = CONTROL_DEFINITIONS.get(id);
        if (definition == null) {
            throw new IllegalArgumentException("Unknown system control.");
        }
        if (!isWindows()) {
            throw new IllegalStateException("System controls are available on Windows only.");
        }
        return definition;
    }

    private List<SystemControl> controls(NetworkInfo network) {
        boolean windows = isWindows();
        String networkName = network.name().toLowerCase(Locale.ROOT);
        return CONTROL_DEFINITIONS.values().stream()
                .sorted(Comparator.comparing(ControlDefinition::id))
                .map(definition -> new SystemControl(
                        definition.id(),
                        definition.label(),
                        definition.id().equals("wifi") && (networkName.contains("wi-fi") || networkName.contains("wlan")),
                        windows,
                        windows ? "Opens the matching Windows setting after approval" : "Windows only"))
                .toList();
    }

    private NetworkInfo networkInfo() {
        try {
            return NetworkInterface.networkInterfaces()
                    .filter(item -> {
                        try {
                            String name = (item.getName() + " " + item.getDisplayName()).toLowerCase(Locale.ROOT);
                            return item.isUp()
                                    && !item.isLoopback()
                                    && !item.isVirtual()
                                    && !name.contains("miniport")
                                    && !name.contains("wfp")
                                    && !name.contains("lightweight filter")
                                    && !name.contains("tunnel")
                                    && item.inetAddresses().anyMatch(address ->
                                            address instanceof java.net.Inet4Address
                                                    && !address.isLoopbackAddress()
                                                    && !address.isLinkLocalAddress());
                        } catch (Exception ignored) {
                            return false;
                        }
                    })
                    .sorted(Comparator.comparingInt(this::networkPriority))
                    .findFirst()
                    .map(item -> {
                        String address = item.inetAddresses()
                                .filter(candidate -> candidate instanceof java.net.Inet4Address)
                                .findFirst()
                                .map(java.net.InetAddress::getHostAddress)
                                .orElse("Connected");
                        String rawName = (item.getName() + " " + item.getDisplayName()).toLowerCase(Locale.ROOT);
                        String label = rawName.contains("wi-fi") || rawName.contains("wifi")
                                        || rawName.contains("wlan") || rawName.contains("wireless")
                                ? "Wi-Fi"
                                : item.getName();
                        return new NetworkInfo(label, address, true);
                    })
                    .orElseGet(() -> new NetworkInfo("No active network", "Offline", false));
        } catch (Exception ignored) {
            // Return the explicit offline state below.
        }
        return new NetworkInfo("No active network", "Offline", false);
    }

    private int networkPriority(NetworkInterface item) {
        String name = (item.getName() + " " + item.getDisplayName()).toLowerCase(Locale.ROOT);
        if (name.contains("wi-fi") || name.contains("wifi") || name.contains("wlan") || name.contains("wireless")) {
            return 0;
        }
        if (name.contains("ethernet")) {
            return 1;
        }
        return 2;
    }

    private BatteryInfo batteryInfo() {
        if (!isWindows()) {
            return new BatteryInfo(false, null, "Unavailable");
        }
        try {
            Process process = new ProcessBuilder(
                    "powershell.exe",
                    "-NoProfile",
                    "-NonInteractive",
                    "-Command",
                    "$b=Get-CimInstance Win32_Battery | Select-Object -First 1; if($b){Write-Output ($b.EstimatedChargeRemaining.ToString()+'|'+$b.BatteryStatus.ToString())}")
                    .redirectErrorStream(true)
                    .start();
            if (!process.waitFor(3, java.util.concurrent.TimeUnit.SECONDS)) {
                process.destroyForcibly();
                return new BatteryInfo(false, null, "Unavailable");
            }
            String output = new String(process.getInputStream().readAllBytes()).trim();
            String[] parts = output.split("\\|");
            if (parts.length == 2) {
                int percent = Integer.parseInt(parts[0].trim());
                int status = Integer.parseInt(parts[1].trim());
                String detail = switch (status) {
                    case 2 -> "Discharging";
                    case 6, 7, 8, 9 -> "Charging";
                    default -> "Connected";
                };
                return new BatteryInfo(true, percent, detail);
            }
        } catch (Exception ignored) {
            // Desktops and restricted Windows accounts may not expose a battery.
        }
        return new BatteryInfo(false, null, "Desktop power");
    }

    private boolean isWindows() {
        return System.getProperty("os.name", "").toLowerCase(Locale.ROOT).contains("windows");
    }

    private String environment(String key, String fallback) {
        String value = System.getenv(key);
        return value == null || value.isBlank() ? fallback : value;
    }

    public record SystemSnapshot(
            String capturedAt,
            HostInfo host,
            ResourceInfo resources,
            List<SystemControl> controls) {}

    public record HostInfo(String name, String user, String os, String osVersion, String architecture, int javaVersion) {}

    public record ResourceInfo(
            long cpuPercent,
            long memoryUsedBytes,
            long memoryTotalBytes,
            long storageUsedBytes,
            long storageTotalBytes,
            NetworkInfo network,
            BatteryInfo battery) {}

    public record NetworkInfo(String name, String address, boolean connected) {}

    public record BatteryInfo(boolean available, Integer percent, String detail) {}

    public record SystemControl(String id, String label, boolean enabled, boolean available, String detail) {}

    public record ControlDefinition(String id, String label, String settingsUri) {}

    public record RunningApp(String id, String name, String detail, String icon, boolean running) {}

    public record PhoneLinkInfo(boolean installed, boolean running, String detail, String uri) {}

    private record AppDefinition(String name, String detail, String icon) {}
}
