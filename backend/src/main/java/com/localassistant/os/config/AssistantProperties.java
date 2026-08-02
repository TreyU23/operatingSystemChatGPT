package com.localassistant.os.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "assistant")
public class AssistantProperties {
    private String dataDir = "../data";
    private String workspaceRoot = "..";
    private String openaiApiKey = 
        "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";
    private String openaiModel = "gpt-5.6-sol";
    private String reasoningEffort = "medium";

    public String getDataDir() {
        return dataDir;
    }

    public void setDataDir(String dataDir) {
        this.dataDir = dataDir;
    }

    public String getWorkspaceRoot() {
        return workspaceRoot;
    }

    public void setWorkspaceRoot(String workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
    }

    public String getOpenaiApiKey() {
        return openaiApiKey;
    }

    public void setOpenaiApiKey(String openaiApiKey) {
        this.openaiApiKey = openaiApiKey;
    }

    public String getOpenaiModel() {
        return openaiModel;
    }

    public void setOpenaiModel(String openaiModel) {
        this.openaiModel = openaiModel;
    }

    public String getReasoningEffort() {
        return reasoningEffort;
    }

    public void setReasoningEffort(String reasoningEffort) {
        this.reasoningEffort = reasoningEffort;
    }
}
