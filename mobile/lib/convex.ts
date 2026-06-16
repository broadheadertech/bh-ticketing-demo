// convex.ts — single stable import surface for the shared Convex backend.
//
// Screen agents: import { api } from "@/lib/convex" (NOT the long relative path).
// This re-exports the codegen that lives in the repo root ../convex/_generated,
// which Metro can resolve thanks to watchFolders in metro.config.js.
//
// Usage in a screen:
//   import { useQuery } from "convex/react";
//   import { api } from "@/lib/convex";
//   const events = useQuery(api.events.listPublicEvents);
export { api } from "../../convex/_generated/api";
export type { Id, Doc } from "../../convex/_generated/dataModel";
