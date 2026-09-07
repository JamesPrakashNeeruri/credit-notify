import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const KEY = "cardflow:notify:data";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const data = (await redis.get(KEY)) || { subscription: null, cards: [] };
    return res.status(200).json(data);
  }

  if (req.method === "POST") {
    try {
      const body = req.body || {};
      const existing = (await redis.get(KEY)) || { subscription: null, cards: [] };
      const next = {
        subscription: body.subscription !== undefined ? body.subscription : existing.subscription,
        cards: body.cards !== undefined ? body.cards : existing.cards,
      };
      await redis.set(KEY, next);
      return res.status(200).json({ ok: true, data: next });
    } catch (err) {
      return res.status(500).json({ ok: false, error: String(err) });
    }
  }

  res.status(405).json({ error: "Method not allowed" });
}
