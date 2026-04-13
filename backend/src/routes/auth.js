import express from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query, tx } from "../lib/db.js";
import { id, isYesterday, todayUtc } from "../lib/util.js";
import { signUser } from "../lib/auth.js";
import { COINS } from "../config.js";

const router = express.Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  referralCode: z.string().optional().nullable()
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos" });

  const { email, password, referralCode } = parsed.data;
  const existing = await query("select id from users where email=$1", [email.toLowerCase()]);
  if (existing.rowCount) return res.status(409).json({ error: "Ese correo ya existe" });

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = id("usr");
  const ownCode = `CDROP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  let referredBy = null;

  if (referralCode) {
    const ref = await query("select id from users where referral_code=$1", [referralCode]);
    if (ref.rowCount) referredBy = ref.rows[0].id;
  }

  await tx(async (client) => {
    await client.query(
      `insert into users (id, email, password_hash, referral_code, referred_by, streak, last_login_date, xp, is_admin)
       values ($1,$2,$3,$4,$5,1,$6,0,false)`,
      [userId, email.toLowerCase(), passwordHash, ownCode, referredBy, todayUtc()]
    );

    for (const coin of COINS) {
      await client.query("insert into balances (user_id, coin_id, amount) values ($1,$2,$3)", [userId, coin.id, coin.id === "btc" ? 1000 : 0]);
    }

    await client.query(
      "insert into ledger (id, user_id, coin_id, amount, type, note) values ($1,$2,$3,$4,$5,$6)",
      [id("led"), userId, "btc", 1000, "welcome", "Bonus de bienvenida"]
    );

    if (referredBy) {
      await client.query("update users set referral_count = referral_count + 1 where id=$1", [referredBy]);
    }
  });

  const userResult = await query("select id, email, is_admin from users where id=$1", [userId]);
  return res.json({ token: signUser(userResult.rows[0]) });
});

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });
router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos" });

  const result = await query("select * from users where email=$1", [parsed.data.email.toLowerCase()]);
  if (!result.rowCount) return res.status(401).json({ error: "Credenciales inválidas" });
  const user = result.rows[0];
  const ok = await bcrypt.compare(parsed.data.password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

  const today = todayUtc();
  if (user.last_login_date !== today) {
    const streak = user.last_login_date && isYesterday(user.last_login_date) ? user.streak + 1 : 1;
    await query("update users set streak=$1, last_login_date=$2 where id=$3", [streak, today, user.id]);
  }

  return res.json({ token: signUser(user) });
});

export default router;
