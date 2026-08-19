package com.localassistant.os.profile;

import java.util.regex.Pattern;

public final class ProfileContext {
    public static final String DEFAULT_PROFILE = "default";
    private static final Pattern SAFE_ID = Pattern.compile("[A-Za-z0-9_-]{1,80}");
    private static final ThreadLocal<String> CURRENT = ThreadLocal.withInitial(() -> DEFAULT_PROFILE);

    private ProfileContext() {}

    public static String currentId() {
        return CURRENT.get();
    }

    public static void set(String requestedId) {
        String value = requestedId == null || requestedId.isBlank() ? DEFAULT_PROFILE : requestedId.trim();
        CURRENT.set(SAFE_ID.matcher(value).matches() ? value : DEFAULT_PROFILE);
    }

    public static void clear() {
        CURRENT.remove();
    }
}
