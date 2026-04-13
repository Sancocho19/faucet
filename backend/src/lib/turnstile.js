import { config } from "../config.js";

export async function verifyTurnstile(token, remoteip = undefined) {
  if (!config.turnstileSecret) {
    return { success: true, skipped: true };
  }
  const body = new URLSearchParams();
  body.set("secret", config.turnstileSecret);
  body.set("response", token || "");
  if (remoteip) body.set("remoteip", remoteip);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body
  });
  return response.json();
}
