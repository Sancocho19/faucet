import express from "express";
import { z } from "zod";
import { LOTTERY_TICKET_PRICE } from "../config.js";
import { requireAuth } from "../middleware/auth.js";
import { tx, query } from "../lib/db.js";
import { id } from "../lib/util.js";

const router = express.Router();
const schema = z.object({ coinId: z.string(), qty: z.number().int().min(1).max(100) });

router.post("/buy", requireAuth, async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos" });

  const { coinId, qty } = parsed.data;
  const total = qty * LOTTERY_TICKET_PRICE;
  const bal = await query("select amount from balances where user_id=$1 and coin_id=$2", [req.user.id, coinId]);
  if (!bal.rowCount || Number(bal.rows[0].amount) < total) return res.status(400).json({ error: "Saldo insuficiente" });

  await tx(async (client) => {
    await client.query("update balances set amount = amount - $1, updated_at = now() where user_id=$2 and coin_id=$3", [total, req.user.id, coinId]);
    await client.query("insert into lottery_tickets (id, user_id, qty) values ($1,$2,$3)", [id("tix"), req.user.id, qty]);
    await client.query("update lottery_state set pool = pool + $1 where id=1", [total]);
    await client.query("insert into ledger (id, user_id, coin_id, amount, type, note) values ($1,$2,$3,$4,$5,$6)", [id("led"), req.user.id, coinId, -total, "lottery_buy", `qty ${qty}`]);
  });

  res.json({ ok: true });
});

export default router;
