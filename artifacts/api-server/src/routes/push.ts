import { Router } from "express";
import { pool } from "../db";

const router = Router();

pool.query(`
  CREATE TABLE IF NOT EXISTS lawn_push_tokens (
    id           SERIAL PRIMARY KEY,
    username     TEXT NOT NULL,
    role         TEXT NOT NULL,
    token        TEXT NOT NULL,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (username, role, token)
  )
`).catch((e) => console.error("Failed to create lawn_push_tokens:", e));

// POST /api/push/register  { username, role, token }
router.post("/register", async (req, res) => {
  const { username, role, token } = req.body as { username: string; role: string; token: string };
  if (!username || !role || !token) {
    return res.status(400).json({ error: "Missing fields" });
  }
  try {
    await pool.query(
      `INSERT INTO lawn_push_tokens (username, role, token)
       VALUES ($1, $2, $3)
       ON CONFLICT (username, role, token) DO NOTHING`,
      [username.toLowerCase().trim(), role, token]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error("Push register error:", err);
    return res.status(500).json({ error: "Failed to register token" });
  }
});

// POST /api/push/send  { username, role, title, body, data? }
router.post("/send", async (req, res) => {
  const { username, role, title, body, data } = req.body as {
    username: string; role: string; title: string; body: string; data?: Record<string, unknown>;
  };
  if (!username || !role || !title || !body) {
    return res.status(400).json({ error: "Missing fields" });
  }
  try {
    const result = await pool.query(
      "SELECT token FROM lawn_push_tokens WHERE username = $1 AND role = $2",
      [username.toLowerCase().trim(), role]
    );
    if (result.rows.length === 0) return res.json({ success: true, sent: 0 });

    const messages = result.rows.map((row) => ({
      to: row.token,
      sound: "default" as const,
      title,
      body,
      data: data ?? {},
    }));

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });

    const json = await response.json();
    return res.json({ success: true, sent: messages.length, expo: json });
  } catch (err) {
    console.error("Push send error:", err);
    return res.status(500).json({ error: "Failed to send push" });
  }
});

export async function sendPushToUser(username: string, role: string, title: string, body: string, data?: Record<string, unknown>) {
  try {
    const result = await pool.query(
      "SELECT token FROM lawn_push_tokens WHERE username = $1 AND role = $2",
      [username.toLowerCase().trim(), role]
    );
    if (result.rows.length === 0) return;

    const messages = result.rows.map((row) => ({
      to: row.token,
      sound: "default" as const,
      title,
      body,
      data: data ?? {},
    }));

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    console.error("Push notification error:", err);
  }
}

export default router;
