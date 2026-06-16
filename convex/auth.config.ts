// Clerk ↔ Convex authentication config.
//
// `ConvexProviderWithClerk` (src/components/providers.tsx) sends the Clerk
// session JWT to Convex; Convex validates it against this provider list.
//
// Setup:
//   1. In the Clerk dashboard → JWT Templates, create a template named "convex".
//   2. Copy its Issuer URL (your Clerk Frontend API, e.g.
//      https://<slug>.clerk.accounts.dev) and set it on the Convex deployment:
//        npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<slug>.clerk.accounts.dev
//
// `applicationID` must match the JWT template name ("convex").
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
