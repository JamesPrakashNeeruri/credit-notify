import webpush from "web-push";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const KEY = "cardflow:notify:data";

webpush.setVapidDetails(
  "mailto:cardflow-notify@example.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Returns "today" as a date-only object in IST (UTC+5:30), regardless of the server's own timezone.
function todayIST() {
  const now = new Date();
  const istMs = now.getTime() + (5.5 * 60 + now.getTimezoneOffset()) * 60000;
  const ist = new Date(istMs);
  return new Date(ist.getFullYear(), ist.getMonth(), ist.getDate());
}

// Finds the next occurrence of dueDay (this month if not yet passed, otherwise next month)
// and returns how many days from today that due date is.
function daysUntilDue(dueDay, today) {
  let due = new Date(today.getFullYear(), today.getMonth(), dueDay);
  if (due < today) {
    due = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
  }
  return Math.round((due - today) / 86400000);
}

export default async function handler(req, res) {
  // Vercel Cron sends a GET request; allow manual triggering too for testing.
  try {
    const data = (await redis.get(KEY)) || { subscription: null, cards: [] };
    const { subscription, cards } = data;

    if (!subscription || !cards || cards.length === 0) {
      return res.status(200).json({ ok: true, sent: 0, note: "No subscription or no cards saved yet." });
    }

    const today = todayIST();
    const due = cards.filter((c) => {
      const remindDaysBefore = c.remindDaysBefore ?? 3;
      const diff = daysUntilDue(Number(c.dueDay), today);
      return diff === remindDaysBefore || diff === 0;
    });

    let sent = 0;
    const errors = [];
    for (const c of due) {
      const diff = daysUntilDue(Number(c.dueDay), today);
      const body =
        diff === 0
          ? `${c.name} bill is due today.`
          : `${c.name} bill is due in ${diff} day${diff === 1 ? "" : "s"}.`;
      try {
        await webpush.sendNotification(
          subscription,
          JSON.stringify({ title: "CardFlow Reminder", body })
        );
        sent++;
      } catch (err) {
        errors.push({ card: c.name, error: String(err) });
      }
    }

    return res.status(200).json({ ok: true, sent, checked: cards.length, matched: due.length, errors });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
