import express from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { COINS } from "../config.js";
import { id } from "../lib/util.js";
import { tx, query } from "../lib/db.js";

const router = express.Router();
const schema = z.object({ coinId: z.string(), amount: z.number().int().positive(), address: z.string().min(4).max(255) });

router.post("/withdraw-request", requireAuth, async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos" });

  const { coinId, amount, address } = parsed.data;
  const coin = COINS.find((x) => x.id === coinId);
  if (!coin) return res.status(400).json({ error: "Moneda inválida" });
  if (amount < coin.minWithdraw) return res.status(400).json({ error: `Mínimo ${coin.minWithdraw}` });

  const balance = await query("select amount from balances where user_id=$1 and coin_id=$2", [req.user.id, coinId]);
  if (!balance.rowCount || Number(balance.rows[0].amount) < amount) return res.status(400).json({ error: "Saldo insuficiente" });

  await tx(async (client) => {
    await client.query("update balances set amount = amount - $1, updated_at = now() where user_id=$2 and coin_id=$3", [amount, req.user.id, coinId]);
    await client.query(
      "insert into withdrawal_requests (id, user_id, coin_id, amount, address, status) values ($1,$2,$3,$4,$5,'pending')",
      [id("wd"), req.user.id, coinId, amount, address]
    );
    await client.query("insert into ledger (id, user_id, coin_id, amount, type, note) values ($1,$2,$3,$4,$5,$6)", [id("led"), req.user.id, coinId, -amount, "withdraw_request", address]);
  });

  res.json({ ok: true });
});

router.get("/withdrawals", requireAuth, async (req, res) => {
  const result = await query("select id, coin_id, amount, address, status, created_at, processed_at from withdrawal_requests where user_id=$1 order by created_at desc limit 50", [req.user.id]);
  res.json(result.rows);
});

export default router;
