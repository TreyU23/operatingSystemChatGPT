package com.localassistant.os.model;

import java.util.Map;

public record AssistantAction(
        String id,
        String kind,
        String status,
        Map<String, Object> arguments,
        String reason,
        Object result,
        String error,
        String createdAt,
        String updatedAt) {}
