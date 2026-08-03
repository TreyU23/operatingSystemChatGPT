package com.localassistant.os.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;

class ICloudCalendarServiceTest {
    @Test
    void parsesRecurringICloudEventsForTheSelectedDay() {
        String calendar = """
                BEGIN:VCALENDAR
                VERSION:2.0
                PRODID:-//Live Desktop Test//EN
                BEGIN:VEVENT
                UID:daily-sync
                DTSTART:20260802T150000Z
                DTEND:20260802T153000Z
                RRULE:FREQ=DAILY;COUNT=2
                SUMMARY:Daily sync
                LOCATION:Teams
                END:VEVENT
                END:VCALENDAR
                """.replace("\n", "\r\n");

        var service = new ICloudCalendarService(null);
        var events = service.parseEvents(calendar, "Work", LocalDate.of(2026, 8, 3), ZoneId.of("UTC"));

        assertThat(events).hasSize(1);
        assertThat(events.getFirst().title()).isEqualTo("Daily sync");
        assertThat(events.getFirst().location()).isEqualTo("Teams");
        assertThat(events.getFirst().calendar()).isEqualTo("Work");
    }
}
