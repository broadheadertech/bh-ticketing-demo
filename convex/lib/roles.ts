import { ConvexError } from "convex/values";

export const VALID_ROLES = [
  "attendee",
  "artist",
  "organization",
  "venue_manager",
  "admin",
  "staff",
] as const;

export type ValidRole = (typeof VALID_ROLES)[number];

/** Roles users can self-assign. Admin requires manual grant. */
export const SELF_ASSIGNABLE_ROLES: readonly ValidRole[] = [
  "attendee",
  "artist",
  "organization",
  "venue_manager",
];

export function isValidRole(role: string): role is ValidRole {
  return VALID_ROLES.includes(role as ValidRole);
}

export function requireRole(
  user: { activeRole: string } | null,
  role: string
): void {
  if (!user) {
    throw new ConvexError("User not found");
  }
  if (user.activeRole !== role) {
    throw new ConvexError(
      `This action requires the "${role}" role. Your active role is "${user.activeRole}".`
    );
  }
}

export function requireAnyRole(
  user: { activeRole: string } | null,
  roles: string[]
): void {
  if (!user) {
    throw new ConvexError("User not found");
  }
  if (!roles.includes(user.activeRole)) {
    throw new ConvexError(
      `This action requires one of these roles: ${roles.join(", ")}. Your active role is "${user.activeRole}".`
    );
  }
}
