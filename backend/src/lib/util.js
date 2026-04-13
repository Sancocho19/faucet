import crypto from "crypto";

export function id(prefix = "id") {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

export function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

export function isYesterday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(`${dateStr}T00:00:00Z`);
  const y = new Date();
  y.setUTCHours(0, 0, 0, 0);
  y.setUTCDate(y.getUTCDate() - 1);
  return d.toISOString().slice(0, 10) === y.toISOString().slice(0, 10);
}

export function levelBonus(xp) {
  if (xp >= 60000) return 75;
  if (xp >= 25000) return 50;
  if (xp >= 9000) return 35;
  if (xp >= 3500) return 25;
  if (xp >= 1200) return 15;
  if (xp >= 400) return 8;
  return 0;
}

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function faucetReward(coin, xp, streak) {
  const roll = Math.floor(Math.random() * 10001);
  let reward = coin.faucetMin;
  if (roll >= 9999) reward = coin.faucetMax * 30;
  else if (roll >= 9995) reward = coin.faucetMax * 8;
  else if (roll >= 9988) reward = coin.faucetMax * 3;
  else if (roll >= 9900) reward = coin.faucetMax;
  else reward = Math.floor(Math.random() * (Math.max(coin.faucetMin + 5, Math.floor(coin.faucetMax * 0.2)) - coin.faucetMin + 1)) + coin.faucetMin;

  const bonus = Math.floor((reward * levelBonus(xp)) / 100);
  const streakBonus = Math.floor((reward * clamp(streak * 4, 0, 40)) / 100);
  return { roll, total: reward + bonus + streakBonus, bonus, streakBonus };
}
