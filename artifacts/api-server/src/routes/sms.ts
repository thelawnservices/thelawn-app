import { Router } from "express";

const router = Router();

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return null;
  const twilio = require("twilio");
  return twilio(accountSid, authToken);
}

const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER ?? "";

export async function sendSMS(to: string, message: string): Promise<boolean> {
  const client = getTwilioClient();
  if (!client || !FROM_NUMBER) return false;
  if (!to) return false;
  const digits = to.replace(/\D/g, "");
  if (digits.length < 10) return false;
  const e164 = digits.startsWith("1") ? `+${digits}` : `+1${digits}`;
  try {
    await client.messages.create({ body: message, from: FROM_NUMBER, to: e164 });
    return true;
  } catch (err) {
    console.error("SMS send error:", err);
    return false;
  }
}

// POST /api/sms/send  { to, message }  (internal use only — no public exposure needed)
router.post("/send", async (req, res) => {
  const { to, message } = req.body as { to: string; message: string };
  if (!to || !message) return res.status(400).json({ error: "Missing fields" });
  const ok = await sendSMS(to, message);
  return res.json({ success: ok });
});

export default router;
