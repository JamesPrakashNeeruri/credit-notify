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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const data = (await redis.get(KEY)) || { subscription: null };
    if (!data.subscription) {
      return res.status(400).json({ ok: false, error: "No subscription saved yet. Enable notifications first." });
    }
    await webpush.sendNotification(
      data.subscription,
      JSON.stringify({ title: "CardFlow Test", body: "Push notifications are working!" })
    );
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
