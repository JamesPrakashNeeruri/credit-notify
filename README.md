# CardFlow Notify

Sends you a real push notification a few days before each credit card bill is due —
no ongoing cost, runs entirely on free tiers.

## How it works
- A tiny Next.js app + one background job (Vercel Cron) running once a day.
- Card due-dates and your push subscription are stored in a free Upstash Redis database.
- The cron job checks all cards daily and sends a push notification via the Web Push
  standard when a reminder is due.

This is built for **single personal use** — there's no login system, so anyone with
the link could see/edit the same card list. Don't share the deployed URL publicly.

## ⚠️ iPhone-specific requirement
iOS Safari only allows push notifications from a website if you **Add it to your Home
Screen first** (iOS 16.4+):
1. Open the deployed site in Safari.
2. Tap the Share icon → **Add to Home Screen**.
3. Open the app from the Home Screen icon (not from Safari directly).
4. Then tap **Enable Notifications** inside the app.

Skipping this step means notifications will silently never arrive on iPhone — this is
an Apple platform restriction, not a bug in the app.

Android (Chrome) and desktop browsers don't need this step — enabling notifications
directly in the browser works.

## Troubleshooting
- **No test notification arrives**: check Vercel's function logs (Project →
  Deployments → your deployment → Functions) for `/api/test-push` — it will show
  the exact error (usually a wrong Upstash URL/token or a stale push subscription).
- **iPhone never gets notifications**: confirm you opened the app from the Home
  Screen icon, not Safari, before tapping Enable Notifications.
- **Cron isn't firing**: Vercel's free Hobby plan supports daily cron jobs; confirm
  `vercel.json` deployed correctly and check Project → Cron Jobs in the dashboard for
  its run history.
- **Want a different reminder time**: edit the `schedule` in `vercel.json`
  (currently `"30 3 * * *"`, which is 3:30 AM UTC = 9:00 AM IST) and redeploy.
