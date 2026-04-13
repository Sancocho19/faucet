import express from "express";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { tx, query } from "../lib/db.js";
import { id } from "../lib/util.js";

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get("/withdrawals", async (_req, res) => {
  const result = await query(
    `select w.id, w.user_id, u.email, w.coin_id, w.amount, w.address, w.status, w.created_at
     from withdrawal_requests w join users u on u.id=w.user_id
     order by w.created_at desc limit 100`,
    []
  );
  res.json(result.rows);
});

const reviewSchema = z.object({ id: z.string(), action: z.enum(["approve", "reject"]) });
router.post("/withdrawals/review", async (req, res) => {
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos" });

  const wd = await query("select * from withdrawal_requests where id=$1", [parsed.data.id]);
  if (!wd.rowCount) return res.status(404).json({ error: "No encontrado" });
  const row = wd.rows[0];
  if (row.status !== "pending") return res.status(400).json({ error: "Ya procesado" });

  await tx(async (client) => {
    if (parsed.data.action === "reject") {
      await client.query("update balances set amount = amount + $1 where user_id=$2 and coin_id=$3", [row.amount, row.user_id, row.coin_id]);
      await client.query("insert into ledger (id, user_id, coin_id, amount, type, note) values ($1,$2,$3,$4,$5,$6)", [id("led"), row.user_id, row.coin_id, row.amount, "withdraw_reversal", row.id]);
    }
    await client.query("update withdrawal_requests set status=$1, processed_at=now() where id=$2", [parsed.data.action === "approve" ? "approved" : "rejected", row.id]);
  });

  res.json({ ok: true });
});

export default router;
