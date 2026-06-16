export const APP_NAME = "TIX.PH";

export const DEFAULT_ROLE = "attendee" as const;

export const ROLES = [
  "attendee",
  "artist",
  "organization",
  "venue_manager",
  "admin",
  "staff",
] as const;

export const ROLE_LABELS: Record<string, string> = {
  attendee: "Attendee",
  artist: "Artist",
  organization: "Organization",
  venue_manager: "Venue Manager",
  admin: "Admin",
  staff: "Staff",
};

export const EVENT_TYPES = [
  "concert",
  "racing",
  "seminar",
  "class",
  "other",
] as const;

export const EVENT_TYPE_LABELS: Record<string, string> = {
  concert: "Concert / Gig",
  racing: "Racing Event",
  seminar: "Seminar / Workshop",
  class: "Class / Course",
  other: "Other",
};

export const EVENT_TYPE_DESCRIPTIONS: Record<string, string> = {
  concert: "Live music performances and gigs",
  racing: "Motorsport and racing events",
  seminar: "Workshops, seminars, and talks",
  class: "Educational classes and courses",
  other: "Any other type of event",
};

export const EVENT_STATUSES = [
  "draft",
  "published",
  "on_sale",
  "sold_out",
  "completed",
  "cancelled",
] as const;

export const EVENT_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  on_sale: "On Sale",
  sold_out: "Sold Out",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const EVENT_TYPE_FILTERS = [
  { value: "all", label: "All Types" },
  { value: "concert", label: "Concert" },
  { value: "racing", label: "Racing" },
  { value: "seminar", label: "Seminar" },
  { value: "class", label: "Class" },
  { value: "other", label: "Other" },
] as const;

export const MAX_TIERS_PER_EVENT = 10;

export const VENUE_AMENITIES = [
  "PA System",
  "Projector",
  "Green Room",
  "Bar Service",
  "Parking",
  "Loading Dock",
  "Catering Kitchen",
  "Air Conditioning",
  "WiFi",
  "Outdoor Space",
] as const;

export const MAX_VENUE_PHOTOS = 8;

export const TIER_TEMPLATES: Record<
  string,
  Array<{ name: string; price: number; quantity: number }>
> = {
  concert: [
    { name: "General Admission", price: 30000, quantity: 100 },
    { name: "VIP", price: 80000, quantity: 20 },
  ],
  racing: [
    { name: "Zone A", price: 50000, quantity: 50 },
    { name: "Zone B", price: 35000, quantity: 80 },
    { name: "Pit Access", price: 100000, quantity: 10 },
    { name: "VIP", price: 120000, quantity: 15 },
    { name: "Team Entry", price: 200000, quantity: 5 },
  ],
  seminar: [
    { name: "Early Bird", price: 15000, quantity: 50 },
    { name: "Regular", price: 25000, quantity: 100 },
  ],
  class: [
    { name: "Standard", price: 20000, quantity: 30 },
  ],
  other: [],
};
