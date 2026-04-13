import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config.js";
import { authLimiter, earnLimiter, faucetLimiter } from "./middleware/limits.js";
import authRoutes from "./routes/auth.js";
import meRoutes from "./routes/me.js";
import faucetRoutes from "./routes/faucet.js";
import earnRoutes from "./routes/earn.js";
import lotteryRoutes from "./routes/lottery.js";
import walletRoutes from "./routes/wallet.js";
import adminRoutes from "./routes/admin.js";
import { pool } from "./lib/db.js";

const app = express();
app.use(cors({ origin: config.corsOrigin, credentials: false }));
app.use(helmet());
app.use(express.json({ limit: "500kb" }));
app.use(morgan("dev"));

app.get("/health", async (_req, res) => {
  await pool.query("select 1");
  res.json({ ok: true });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api", meRoutes);
app.use("/api/faucet", faucetLimiter, faucetRoutes);
app.use("/api/earn", earnLimiter, earnRoutes);
app.use("/api/lottery", lotteryRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/admin", adminRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Error interno" });
});

app.listen(config.port, () => {
  console.log(`CryptoDrop backend en http://localhost:${config.port}`);
});
