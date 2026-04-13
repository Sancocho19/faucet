import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { query } from "../lib/db.js";

const router = express.Router();

router.get("/me", requireAuth, async (req, res) => {
  const [user, balances, recent] = await Promise.all([
    query("select id, email, streak, last_login_date, xp, referral_code, referral_count, referral_earned, is_admin from users where id=$1", [req.user.id]),
    query("select coin_id, amount from balances where user_id=$1 order by coin_id", [req.user.id]),
    query("select id, coin_id, amount, type, note, created_at from ledger where user_id=$1 order by created_at desc limit 30", [req.user.id])
  ]);

  const stats = await query(
    `select
      count(*) filter (where type='claim') as claims,
      count(*) filter (where type='win') as wins,
      count(*) filter (where type='earn') as earns,
      count(*) filter (where type='rewarded_ad') as ads
     from ledger where user_id=$1`,
    [req.user.id]
  );

  const cooldown = await query("select next_claim_at from claim_cooldowns where user_id=$1", [req.user.id]);
  const lottery = await query("select pool from lottery_state where id=1", []);
  const tickets = await query("select coalesce(sum(qty),0) as total from lottery_tickets where user_id=$1", [req.user.id]);

  res.json({
    user: user.rows[0],
    balances: balances.rows,
    stats: stats.rows[0],
    cooldownUntil: cooldown.rows[0]?.next_claim_at || null,
    lotteryPool: Number(lottery.rows[0]?.pool || 0),
    lotteryTickets: Number(tickets.rows[0]?.total || 0),
    recent: recent.rows
  });
});

export default router;
