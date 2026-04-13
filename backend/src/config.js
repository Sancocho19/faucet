import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: Number(process.env.PORT || 8080),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/cryptodrop",
  jwtSecret: process.env.JWT_SECRET || "change_me",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  turnstileSecret: process.env.TURNSTILE_SECRET || "",
  adminEmail: process.env.ADMIN_EMAIL || "admin@example.com",
  adminPassword: process.env.ADMIN_PASSWORD || "Admin12345!"
};

export const COINS = [
  { id: "btc", sym: "BTC", minWithdraw: 5000, faucetMin: 20, faucetMax: 200 },
  { id: "doge", sym: "DOGE", minWithdraw: 25000, faucetMin: 80, faucetMax: 2500 },
  { id: "trx", sym: "TRX", minWithdraw: 12000, faucetMin: 50, faucetMax: 900 },
  { id: "ltc", sym: "LTC", minWithdraw: 9000, faucetMin: 45, faucetMax: 550 },
  { id: "bnb", sym: "BNB", minWithdraw: 3000, faucetMin: 8, faucetMax: 90 },
  { id: "eth", sym: "ETH", minWithdraw: 1800, faucetMin: 5, faucetMax: 45 }
];

export const CLAIM_COOLDOWN_SECONDS = 300;
export const LOTTERY_TICKET_PRICE = 25;
