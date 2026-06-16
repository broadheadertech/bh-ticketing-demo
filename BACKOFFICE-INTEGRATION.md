# TIX.PH Back Office — backend wiring analysis

The back office (`/backoffice`) is a single role-switching shell (Admin / Organizer /
Artist / Customer) ported from the `TIX.PH — Back Office.html` design. Today it renders
the design with **representative data** (`src/app/backoffice/_components/mock.ts`), exactly
like the prototype. What's already **live**:

- **Identity** — `users.getCurrentUser` drives the sidebar name/email.
- **Role list + switching** — the switcher only shows roles the account actually has
  (`users.roles`), defaults to the persisted `activeRole`, and calls `users.switchRole`
  on change (so it persists, mirroring the design's `switchRole()`).

Everything below is the screen-by-screen plan to replace mock data with live Convex
queries. **The good news: ~90% of the queries already exist.** The one true gap is the
venue-map builder/templates (needs new schema).

---

## ✅ Already have the backend — just swap mock → `useQuery`

### Admin
| Screen | Live function (exists) | Notes |
|---|---|---|
| Overview (stats, gross-volume, status donut) | `admin.getAdminDashboardMetrics` | Returns users/tickets/volume/active-creators + status counts. |
| Moderation queue + drawer Approve/Unpublish | `admin.listEventsForModeration`, `admin.getEventForModeration`, `admin.adminApproveEvent`, `admin.adminUnpublishEvent` | Wire the drawer's two buttons to the mutations. |
| Users table (search, roles, enable/disable) | `admin.listUsers`, `admin.disableUser`, `admin.enableUser`, `admin.adminUpdateUserRoles` | The "Roles" button → `adminUpdateUserRoles` (only path to grant `admin`). |
| Finance (GMV, 5% fees, payouts, refunds) | `admin.getFinancialMetrics`, `admin.getEventRefundSummary` | Fee % currently hard-coded 5% in UI — read from backend if it becomes configurable. |
| Audit log | **table exists (`auditLogs`), no list query yet** | Add `admin.listAuditLogs({ limit, cursor })` (paginated `auditLogs` by `createdAt`). Small add. |

### Organizer
| Screen | Live function (exists) | Notes |
|---|---|---|
| Overview (revenue, sold, live count, sales trend) | `events.getMyEventsWithStats`, `analytics.getCreatorOverviewAnalytics` | Trend chart needs time-bucketed series — see "Analytics gaps". |
| Events grid (tabs: all/live/draft/pending) | `events.getMyEventsWithStats` | Filter client-side by `status`. |
| Create event (4-step + Theme Builder) | `events.createEvent` (already takes `theme`!), `ticketTiers` create mutations | Wizard already exists at `/dashboard/events/create`; reuse or point "Create event" there. Theme field is live. |
| Attendees & check-in | `tickets.getEventTicketsForCreator`, `tickets.getEntryStats`, `tickets.getUniqueEmailsByEventId` | "Export CSV" = client download of `getUniqueEmailsByEventId`. |
| Promo codes | `promoCodes.getEventPromoCodes`, `createPromoCode`, `togglePromoCode` | Per-event today; for an org-wide list, add `promoCodes.getPromoCodesByCreator`. |
| Team & staff | `staff.getEventStaff`, `assignStaff`, `removeStaff` | "Invite member" → `assignStaff` per event (`staffAssignments`). |
| Payouts | `stripeConnect.*` (onboarding exists) | Balances/history are a gap — see "Payouts gaps". |

### Artist
| Screen | Live function (exists) | Notes |
|---|---|---|
| Public profile editor | `creatorProfiles.getMyProfile`, `creatorProfiles.upsertProfile` | Direct map (displayName/bio/socials/photo). |
| Overview / shows | `events.getMyEventsWithStats` (artist as creator) | "Lineup" linkage (artist on someone else's event) isn't modeled — see "Schema gaps". |
| Followers | `follows.getFollowerCount`, `follows.getMyFollowing` | Counts exist; demographic breakdowns (region/age) are mock-only. |

### Customer
| Screen | Live function (exists) | Notes |
|---|---|---|
| My tickets (wallet, upcoming/past) | `tickets.getMyTickets` | QR shown is representative; the real signed QR is on the ticket doc (`qrCode`/`qrSignature`). |
| Following | `follows.getMyFollowing` | Direct map. |
| Notifications | `notifications.getMyNotifications`, `markAsRead`, `markAllAsRead` | Direct map. |
| Account / roles | `users.getCurrentUser`, `users.addRole`, `users.switchRole` | "Enable" → `addRole` (self-assignable only); admin stays team-granted. |

---

## 🔶 Gaps — need new backend work

### 1. Venue map builder + templates (the only large net-new piece)
The design's organizer "Venue maps" and admin "Venue templates" share one canvas editor
(sections, rows, individual seats, GA zones, curve, rotate, floor-plan upload, undo/redo).
There is **no schema** for this yet. Proposed:

```ts
venueMaps: defineTable({
  ownerId: v.id("users"),
  kind: v.string(),            // "venue" | "template"
  name: v.string(),
  data: v.any(),               // serialized sections/zones/seats geometry
  thumbnailStorageId: v.optional(v.id("_storage")),
  createdAt: v.number(), updatedAt: v.number(),
}).index("by_owner", ["ownerId"]).index("by_kind", ["kind"])
```
Plus: `venueMaps.list/get/save/delete`, and a link from `events` → a chosen map so the
buyer seat-picker renders the organizer's real map. Templates (`kind:"template"`, admin-owned)
seed new organizer maps.

**Editor status:** the full interactive builder is now implemented for **both** organizer
"Venue maps" and admin "Venue templates" (`_components/venue-editor.tsx`) — drag/move stage
+ sections, resize stage, per-section rows/seats/gaps, curve (−120°…120°), rotation with
90/180 snaps, GA zones, duplicate, floor-plan upload + trace, undo/redo, keyboard shortcuts.
It currently holds map geometry in **local component state**; wiring is just the `venueMaps`
table + `save`/`list`/`get` mutations above (the editor's `save()` is a toast today).

### 2. Payouts dashboard (organizer/artist)
Onboarding exists (`stripeConnect.ts`), but balances/in-transit/payout history are mock.
Needs a Convex **action** calling Stripe (`balance.retrieve`, `payouts.list`) for the
connected account, e.g. `stripeConnect.getPayoutSummary`. Server-side only (secret key).

### 3. Analytics time-series
Overview "sales trend" / "gross volume" / "audience growth" charts need bucketed series.
`analytics.ts` returns aggregates, not monthly buckets — add
`analytics.getRevenueSeries({ creatorId?, range })` returning `[{ period, value }]`.

### 4. Artist ↔ event lineup
Artists currently only surface as event *creators*. To show "shows I'm performing at"
(artist booked on an organizer's event) and "your cut", model a lineup link, e.g. an
`eventLineup` table or `lineupArtistIds: v.array(v.id("users"))` on `events`, plus a
revenue-split field. Until then the artist "shows" view reuses creator events.

### 5. Minor adds
- `admin.listAuditLogs` (table exists, query missing).
- `promoCodes.getPromoCodesByCreator` for the org-wide promo list.
- Follower demographics (region/age) — not stored; would need capture at follow time or
  derive from buyer data.

---

## Suggested wiring order
1. Customer (tickets/following/notifications/account) and Artist profile — all queries exist, highest fidelity for the least work.
2. Admin (overview/moderation/users/finance) — all exist; add `listAuditLogs`.
3. Organizer (overview/events/attendees/promos/team) — all exist; add analytics series + org-wide promos.
4. Payouts action (Stripe).
5. Venue map builder + templates (new schema + editor port) — the headline feature, largest effort.
