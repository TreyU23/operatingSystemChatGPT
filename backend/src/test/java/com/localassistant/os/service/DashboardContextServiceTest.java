package com.localassistant.os.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.localassistant.os.store.StateStore;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class DashboardContextServiceTest {
    @Test
    void selectsOnlyTopicsRelevantToThePrompt() {
        DashboardContextService service = serviceWith(mock(WindowsMediaSessionService.class));

        assertThat(service.topicsForPrompt("What song is playing?"))
                .containsExactly("music");
        assertThat(service.topicsForPrompt("What meetings are on my calendar tomorrow?"))
                .containsExactly("calendar");
        assertThat(service.topicsForPrompt("Explain Java records"))
                .isEmpty();
    }

    @Test
    void broadDashboardRequestUsesBoundedKnownTopics() {
        DashboardContextService service = serviceWith(mock(WindowsMediaSessionService.class));

        assertThat(service.topicsForPrompt("Give me a dashboard overview"))
                .containsExactly("summary", "system", "apps", "phone", "calendar", "music", "runtime", "approvals");
    }

    @Test
    void musicContextDropsArtworkPayloads() {
        WindowsMediaSessionService media = mock(WindowsMediaSessionService.class);
        when(media.snapshot()).thenReturn(Map.of(
                "available", true,
                "title", "Track",
                "artist", "Artist",
                "artwork", "data:image/png;base64,very-large-payload"));
        DashboardContextService service = serviceWith(media);

        @SuppressWarnings("unchecked")
        Map<String, Object> music = (Map<String, Object>) service.context(List.of("music"), null).get("music");

        assertThat(music).containsEntry("title", "Track").containsEntry("artist", "Artist");
        assertThat(music).doesNotContainKey("artwork");
    }

    private DashboardContextService serviceWith(WindowsMediaSessionService media) {
        return new DashboardContextService(
                mock(SystemService.class),
                mock(RuntimeService.class),
                mock(ICloudCalendarService.class),
                media,
                mock(ActionService.class),
                mock(StateStore.class));
    }
}
