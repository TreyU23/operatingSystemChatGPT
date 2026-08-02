package com.localassistant.os.service;

import com.localassistant.os.config.AssistantProperties;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class WorkspaceService {
    private static final Set<String> IGNORED_DIRECTORIES =
            Set.of(".git", ".tools", "node_modules", "dist", "target");
    private final Path root;

    public WorkspaceService(AssistantProperties properties) {
        this.root = properties.getWorkspaceRoot().toAbsolutePath().normalize();
    }

    public Path root() {
        return root;
    }

    public Path resolveSafePath(String candidate) throws IOException {
        String requested = candidate == null || candidate.isBlank() ? "." : candidate;
        Path absolute = root.resolve(requested).normalize();
        if (!absolute.startsWith(root)) {
            throw new IllegalArgumentException("Path is outside the configured workspace.");
        }

        Path cursor = root;
        for (Path segment : root.relativize(absolute)) {
            cursor = cursor.resolve(segment);
            if (Files.exists(cursor) && Files.isSymbolicLink(cursor)) {
                throw new IllegalArgumentException("Symbolic links are not allowed in workspace actions.");
            }
            if (Files.notExists(cursor)) {
                break;
            }
        }
        return absolute;
    }

    public FileContents readTextFile(String candidate) throws IOException {
        Path path = resolveSafePath(candidate);
        if (!Files.isRegularFile(path)) {
            throw new IllegalArgumentException("Requested path is not a file.");
        }
        if (Files.size(path) > 100_000) {
            throw new IllegalArgumentException("File is larger than the 100 KB read limit.");
        }
        return new FileContents(root.relativize(path).toString(), Files.readString(path, StandardCharsets.UTF_8));
    }

    public List<String> listFiles(String subdirectory, int requestedLimit) throws IOException {
        Path start = resolveSafePath(subdirectory);
        if (!Files.isDirectory(start)) {
            throw new IllegalArgumentException("Requested path is not a directory.");
        }
        int limit = Math.max(1, Math.min(requestedLimit, 500));
        var results = new ArrayList<String>();

        Files.walkFileTree(start, new SimpleFileVisitor<>() {
            @Override
            public FileVisitResult preVisitDirectory(Path directory, BasicFileAttributes attributes) {
                if (!directory.equals(start)
                        && IGNORED_DIRECTORIES.contains(directory.getFileName().toString())) {
                    return FileVisitResult.SKIP_SUBTREE;
                }
                return results.size() >= limit ? FileVisitResult.TERMINATE : FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attributes) {
                if (results.size() >= limit) {
                    return FileVisitResult.TERMINATE;
                }
                if (attributes.isRegularFile() && !Files.isSymbolicLink(file)) {
                    results.add(root.relativize(file).toString());
                }
                return FileVisitResult.CONTINUE;
            }
        });
        results.sort(Comparator.naturalOrder());
        return results;
    }

    public record FileContents(String path, String content) {}
}
