/**
 * Event-type "kits" — make the one event engine speak each vertical's language.
 * Keyed by the event's `eventType` (concert | racing | seminar | class | other).
 * Pure terminology/config for now (no schema impact); deeper per-type behavior
 * (waivers, certificates, results, custom reg questions) can layer on top.
 */
export type EventKit = {
  /** Plural label for the people on the event (lineup section, picker). */
  participantsLabel: string;
  /** Singular, for buttons/empty states. */
  participantsSingular: string;
  /** Helper text under the picker. */
  participantsHint: string;
  /** Search box placeholder in the picker. */
  searchPlaceholder: string;
  /** Label for the multi-day / sessions section. */
  scheduleLabel: string;
};

export const EVENT_KITS: Record<string, EventKit> = {
  concert: {
    participantsLabel: "Lineup",
    participantsSingular: "artist",
    participantsHint: "Artists performing at this event",
    searchPlaceholder: "Search artists by name…",
    scheduleLabel: "Schedule",
  },
  racing: {
    participantsLabel: "Racers & teams",
    participantsSingular: "racer",
    participantsHint: "Competitors at this event",
    searchPlaceholder: "Search racers & teams…",
    scheduleLabel: "Race schedule",
  },
  seminar: {
    participantsLabel: "Speakers",
    participantsSingular: "speaker",
    participantsHint: "Speakers & facilitators",
    searchPlaceholder: "Search speakers…",
    scheduleLabel: "Agenda",
  },
  class: {
    participantsLabel: "Instructors",
    participantsSingular: "instructor",
    participantsHint: "Instructors leading this class",
    searchPlaceholder: "Search instructors…",
    scheduleLabel: "Schedule",
  },
  other: {
    participantsLabel: "Participants",
    participantsSingular: "participant",
    participantsHint: "People involved in this event",
    searchPlaceholder: "Search people…",
    scheduleLabel: "Schedule",
  },
};

export function kitFor(eventType?: string | null): EventKit {
  return EVENT_KITS[eventType ?? "other"] ?? EVENT_KITS.other;
}
