import { Router } from "express";
import nodemailer from "nodemailer";

const router = Router();

function createTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
}

// POST /api/crash  { error, stack, context, username, role, appVersion }
router.post("/", async (req, res) => {
  const { error, stack, context, username, role, appVersion } = req.body as {
    error: string; stack?: string; context?: string;
    username?: string; role?: string; appVersion?: string;
  };

  if (!error) return res.status(400).json({ ok: false });

  const transporter = createTransporter();
  if (!transporter) return res.json({ ok: true, queued: false });

  const submittedAt = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York", dateStyle: "full", timeStyle: "short",
  });

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;background:#f9f9f9;border-radius:8px;border:1px solid #ddd;overflow:hidden;">
      <div style="background:#0A0A0A;padding:24px 32px;text-align:center;">
        <h1 style="color:#FF4444;margin:0;font-size:20px;letter-spacing:1px;">⚠️ APP CRASH REPORT</h1>
        <p style="color:#888;margin:4px 0 0;font-size:13px;">TheLawn Services — Automated Crash Reporting</p>
      </div>
      <div style="padding:28px 32px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr style="border-bottom:1px solid #eee;">
            <td style="padding:12px 0;font-size:13px;color:#666;font-weight:bold;width:36%;">Error</td>
            <td style="padding:12px 0;font-size:14px;color:#c0392b;font-family:monospace;">${error}</td>
          </tr>
          <tr style="border-bottom:1px solid #eee;">
            <td style="padding:12px 0;font-size:13px;color:#666;font-weight:bold;">User</td>
            <td style="padding:12px 0;font-size:14px;color:#111;">${username ? `${username} (${role})` : "Anonymous"}</td>
          </tr>
          <tr style="border-bottom:1px solid #eee;">
            <td style="padding:12px 0;font-size:13px;color:#666;font-weight:bold;">App Version</td>
            <td style="padding:12px 0;font-size:14px;color:#111;">${appVersion ?? "Unknown"}</td>
          </tr>
          ${context ? `<tr style="border-bottom:1px solid #eee;">
            <td style="padding:12px 0;font-size:13px;color:#666;font-weight:bold;">Context</td>
            <td style="padding:12px 0;font-size:14px;color:#111;">${context}</td>
          </tr>` : ""}
          ${stack ? `<tr>
            <td style="padding:12px 0;font-size:13px;color:#666;font-weight:bold;vertical-align:top;">Stack Trace</td>
            <td style="padding:12px 0;font-size:12px;color:#555;font-family:monospace;white-space:pre-wrap;">${stack.substring(0, 2000)}</td>
          </tr>` : ""}
        </table>
        <div style="margin-top:20px;padding:10px 14px;background:#f0f0f0;border-radius:6px;font-size:12px;color:#777;">
          Reported: ${submittedAt} ET
        </div>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"TheLawn Crash Reporter" <${process.env.GMAIL_USER}>`,
      to: "TheLawnServices@gmail.com",
      subject: `⚠️ App Crash — ${error.substring(0, 80)}`,
      html,
    });
    return res.json({ ok: true });
  } catch {
    return res.json({ ok: true, queued: false });
  }
});

export default router;
