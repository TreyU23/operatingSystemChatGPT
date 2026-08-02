package com.localassistant.os;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
        "assistant.data-dir=target/test-data",
        "assistant.workspace-root=.",
        "assistant.openai-api-key="
})
class AssistantApplicationTest {
    @Test
    void contextLoads() {
        assertThat(true).isTrue();
    }
}
