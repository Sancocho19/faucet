import express from "express";
import { z } from "zod";
import { COINS, CLAIM_COOLDOWN_SECONDS } from "../config.js";
import { query, tx } from "../lib/db.js";
import { faucetReward, id } from "../lib/util.js";
import { requireAuth } from "../middleware/auth.js";
import { verifyTurnstile } from "../lib/turnstile.js";

const router = express.Router();
const schema = z.object({ coinId: z.string(), captchaToken: z.string().optional().nullable() });

router.get("/status", requireAuth, async (req, res) => {
  const cooldown = await query("select next_claim_at from claim_cooldowns where user_id=$1", [req.user.id]);
  res.json({ cooldownUntil: cooldown.rows[0]?.next_claim_at || null });
});

router.post("/claim", requireAuth, async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos" });

  const coin = COINS.find((c) => c.id === parsed.data.coinId);
  if (!coin) return res.status(400).json({ error: "Moneda inválida" });

  const turnstile = await verifyTurnstile(parsed.data.captchaToken, req.ip);
  if (!turnstile.success) return res.status(400).json({ error: "Verificación fallida" });

  const [userResult, cdResult] = await Promise.all([
    query("select xp, streak from users where id=$1", [req.user.id]),
    query("select next_claim_at from claim_cooldowns where user_id=$1", [req.user.id])
  ]);

  const nextClaimAt = cdResult.rows[0]?.next_claim_at ? new Date(cdResult.rows[0].next_claim_at).getTime() : 0;
  if (nextClaimAt > Date.now()) {
    return res.status(429).json({ error: "Aún no puedes reclamar", cooldownUntil: cdResult.rows[0].next_claim_at });
  }

  const reward = faucetReward(coin, Number(userResult.rows[0].xp || 0), Number(userResult.rows[0].streak || 1));

  await tx(async (client) => {
    await client.query("update balances set amount = amount + $1, updated_at = now() where user_id=$2 and coin_id=$3", [reward.total, req.user.id, coin.id]);
    await client.query("update users set xp = xp + 25 where id=$1", [req.user.id]);
    await client.query(
      `insert into claim_cooldowns (user_id, next_claim_at)
       values ($1, now() + ($2 || ' seconds')::interval)
       on conflict (user_id) do update set next_claim_at = excluded.next_claim_at`,
      [req.user.id, CLAIM_COOLDOWN_SECONDS]
    );
    await client.query("insert into lottery_tickets (id, user_id, qty) values ($1,$2,$3)", [id("tix"), req.user.id, 2]);
    await client.query("update lottery_state set pool = pool + $1 where id=1", [Math.floor(reward.total * 0.15)]);
    await client.query(
      "insert into ledger (id, user_id, coin_id, amount, type, note) values ($1,$2,$3,$4,$5,$6)",
      [id("led"), req.user.id, coin.id, reward.total, "claim", `Roll ${reward.roll}`]
    );
  });

  return res.json({ reward });
});

export default router;
