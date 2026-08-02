package com.localassistant.os.model;

import java.util.List;

public record Conversation(
        String id,
        String title,
        List<ConversationMessage> messages,
        String createdAt,
        String updatedAt) {}
