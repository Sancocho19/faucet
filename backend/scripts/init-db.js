import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import { pool } from "../src/lib/db.js";
import { config, COINS } from "../src/config.js";
import { id, todayUtc } from "../src/lib/util.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
await pool.query(schema);

const exists = await pool.query("select id from users where email=$1", [config.adminEmail.toLowerCase()]);
if (!exists.rowCount) {
  const adminId = id("usr");
  const hash = await bcrypt.hash(config.adminPassword, 10);
  await pool.query(
    `insert into users (id, email, password_hash, referral_code, streak, last_login_date, xp, is_admin, referral_count, referral_earned)
     values ($1,$2,$3,$4,1,$5,0,true,0,0)`,
    [adminId, config.adminEmail.toLowerCase(), hash, `ADMIN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, todayUtc()]
  );
  for (const coin of COINS) {
    await pool.query("insert into balances (user_id, coin_id, amount) values ($1,$2,$3)", [adminId, coin.id, 0]);
  }
  console.log("Admin creado:", config.adminEmail);
}

console.log("DB inicializada");
await pool.end();
