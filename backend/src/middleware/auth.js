import { verifyToken } from "../lib/auth.js";
import { query } from "../lib/db.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "No autorizado" });
    const payload = verifyToken(token);
    const result = await query("select id, email, is_admin from users where id=$1", [payload.sub]);
    if (!result.rowCount) return res.status(401).json({ error: "Token inválido" });
    req.user = result.rows[0];
    next();
  } catch {
    res.status(401).json({ error: "No autorizado" });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user?.is_admin) return res.status(403).json({ error: "Solo admin" });
  next();
}
