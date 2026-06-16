// Creates demo login accounts in Clerk (via the Backend REST API) for the
// presentation, then writes their Clerk IDs to /c/tmp/demo-accounts.json so a
// Convex mutation can attach roles.
//
// Usage:  node scripts/create-demo-users.mjs
// Requires CLERK_SECRET_KEY in .env.local (test instance).
//
// This is idempotent-ish: if a user with the email already exists, it reuses it.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// --- load CLERK_SECRET_KEY from .env.local ---
const env = readFileSync(join(root, ".env.local"), "utf8");
const secret = env.match(/^CLERK_SECRET_KEY=(.+)$/m)?.[1]?.trim();
if (!secret || secret.includes("placeholder")) {
  console.error("CLERK_SECRET_KEY missing or placeholder in .env.local");
  process.exit(1);
}

const PASSWORD = "PhliveDemo2026!";
const DEMO_USERS = [
  { name: "Demo Organizer", email: "organizer@phlive-demo.com", username: "phlive_organizer", phone: "+15555550101", roles: ["organization"], claimSeedEvents: true },
  { name: "Demo Admin", email: "admin@phlive-demo.com", username: "phlive_admin", phone: "+15555550102", roles: ["admin"] },
  { name: "Demo Attendee", email: "attendee@phlive-demo.com", username: "phlive_attendee", phone: "+15555550103", roles: ["attendee"] },
];

const API = "https://api.clerk.com/v1";
const headers = {
  Authorization: `Bearer ${secret}`,
  "Content-Type": "application/json",
};

async function findByEmail(email) {
  const res = await fetch(`${API}/users?email_address=${encodeURIComponent(email)}`, { headers });
  if (!res.ok) return null;
  const list = await res.json();
  return Array.isArray(list) && list.length ? list[0] : null;
}

async function createUser(u) {
  const [first, ...rest] = u.name.split(" ");
  const res = await fetch(`${API}/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email_address: [u.email],
      ...(u.phone ? { phone_number: [u.phone] } : {}),
      ...(u.username ? { username: u.username } : {}),
      password: PASSWORD,
      first_name: first,
      last_name: rest.join(" ") || undefined,
      skip_password_checks: true,
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    const msg = body?.errors?.map((e) => e.message + (e.long_message ? ` — ${e.long_message}` : "")).join("; ") || JSON.stringify(body);
    throw new Error(`create ${u.email}: ${msg}`);
  }
  return body;
}

const out = [];
for (const u of DEMO_USERS) {
  let existing = await findByEmail(u.email);
  let clerkUser;
  if (existing) {
    clerkUser = existing;
    console.error(`• reused existing ${u.email} (${existing.id})`);
  } else {
    clerkUser = await createUser(u);
    console.error(`• created ${u.email} (${clerkUser.id})`);
  }
  out.push({ clerkId: clerkUser.id, name: u.name, email: u.email, roles: u.roles, claimSeedEvents: !!u.claimSeedEvents });
}

const payload = { accounts: out };
const outPath = "C:/tmp/demo-accounts.json";
writeFileSync(outPath, JSON.stringify(payload));
console.error(`\nWrote ${out.length} accounts → ${outPath}`);
console.error(`Password for all demo accounts: ${PASSWORD}`);
