import express from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { query, tx } from "../lib/db.js";
import { id } from "../lib/util.js";

const router = express.Router();

const schema = z.object({
  kind: z.enum(["offerwall", "survey", "rewarded_ad", "social"]),
  coinId: z.string(),
  amount: z.number().int().positive().max(50000),
  externalRef: z.string().optional().nullable()
});

router.post("/credit", requireAuth, async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos" });

  const { kind, coinId, amount, externalRef } = parsed.data;

  await tx(async (client) => {
    await client.query("insert into earn_events (id, user_id, source, reward, coin_id, external_ref) values ($1,$2,$3,$4,$5,$6)", [id("ern"), req.user.id, kind, amount, coinId, externalRef || null]);
    await client.query("update balances set amount = amount + $1, updated_at = now() where user_id=$2 and coin_id=$3", [amount, req.user.id, coinId]);
    await client.query("update users set xp = xp + $1 where id=$2", [kind === "rewarded_ad" ? 20 : 60, req.user.id]);
    await client.query("insert into ledger (id, user_id, coin_id, amount, type, note) values ($1,$2,$3,$4,$5,$6)", [id("led"), req.user.id, coinId, amount, kind === "rewarded_ad" ? "rewarded_ad" : "earn", kind]);
  });

  res.json({ ok: true });
});

export default router;
