export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export type UserRole =
  | "attendee"
  | "artist"
  | "organization"
  | "venue_manager"
  | "admin";
