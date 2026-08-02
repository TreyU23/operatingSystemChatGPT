package com.localassistant.os.model;

public record ConversationMessage(String id, String role, String content, String createdAt) {}
