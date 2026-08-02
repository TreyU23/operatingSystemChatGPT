package com.localassistant.os.model;

import java.util.ArrayList;
import java.util.List;

public record AppState(
        int version,
        List<Conversation> conversations,
        List<Memory> memories,
        List<AssistantAction> actions) {

    public static AppState empty() {
        return new AppState(1, new ArrayList<>(), new ArrayList<>(), new ArrayList<>());
    }
}
