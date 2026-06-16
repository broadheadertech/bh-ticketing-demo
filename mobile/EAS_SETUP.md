# EAS dev build — enabling end-to-end push notifications

The push pipeline (register token → store in Convex → send on every notification)
is fully built. The only thing it needs to actually deliver on a device is a
**dev build with an EAS `projectId`** — and that step requires *your* Expo account,
so it can't be done from this repo automatically. Here's the whole flow.

## 1. One-time account + project link
```bash
cd mobile
npm install -g eas-cli          # or: npx eas-cli@latest <cmd>
eas login                       # your Expo account (free)
eas init                        # creates the project, writes extra.eas.projectId into app.json
```
After `eas init`, `app.json` will contain:
```json
"extra": { "eas": { "projectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" } }
```
That `projectId` is what `lib/push.ts` reads to mint a push token.

## 2. Build a development client
Pick the platform you'll test on (a **physical device** — push doesn't work on simulators):

```bash
# Android (APK you can sideload):
eas build --profile development --platform android

# iOS (needs an Apple Developer account for device builds):
eas build --profile development --platform ios
```
EAS builds in the cloud and gives you a download link / QR. Install it on your phone.

## 3. Run against the dev client
```bash
npx expo start --dev-client
```
Open the installed **dev build** (not Expo Go) and scan the QR. Now:
- On first sign-in, the app requests notification permission and calls
  `push.savePushToken` → a row appears in the Convex `pushTokens` table.
- Any `notifications:createNotification` (e.g. an event approval) schedules
  `push.sendToUser`, which delivers via Expo's push service to that device.

## Quick test of delivery
With a token stored, you can fire a test push from the Convex dashboard or CLI by
creating a notification for your user, or hit Expo's API directly:
```bash
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d '{"to":"ExponentPushToken[...]","title":"TIX.PH","body":"Tickets are on sale!"}'
```

## Notes
- **Android + Expo Go can't receive remote pushes since SDK 53** — the dev build
  is required there. iOS Expo Go is more permissive but a dev build is the reliable path.
- `eas.json` already defines `development` (dev client), `preview` (internal APK),
  and `production` profiles.
- Store submission (`eas submit`) needs your Apple/Google developer accounts — a
  later step, separate from getting push working in development.
