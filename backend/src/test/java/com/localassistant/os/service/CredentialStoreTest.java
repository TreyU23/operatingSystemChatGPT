package com.localassistant.os.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.localassistant.os.config.AssistantProperties;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledOnOs;
import org.junit.jupiter.api.condition.OS;
import org.junit.jupiter.api.io.TempDir;

@EnabledOnOs(OS.WINDOWS)
class CredentialStoreTest {
    @TempDir
    Path tempDir;

    @Test
    void protectsAndRestoresICloudPasswordWithWindowsDpapi() throws Exception {
        ICloudCredentialStore store = new ICloudCredentialStore(properties());

        store.save("person@icloud.com", "abcd-efgh-ijkl-mnop");

        assertThat(store.load()).contains(new ICloudCredentialStore.Credentials(
                "person@icloud.com", "abcd-efgh-ijkl-mnop"));
    }

    private AssistantProperties properties() {
        AssistantProperties properties = new AssistantProperties();
        properties.setDataDir(tempDir.toString());
        return properties;
    }
}
