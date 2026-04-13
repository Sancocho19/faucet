import jwt from "jsonwebtoken";
import { config } from "../config.js";

export function signUser(user) {
  return jwt.sign({ sub: user.id, email: user.email, isAdmin: user.is_admin }, config.jwtSecret, { expiresIn: "7d" });
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}
