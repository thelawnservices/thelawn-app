import { Router, Request, Response } from "express";
import multer from "multer";
import nodemailer from "nodemailer";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

function createTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

const CATEGORY_ICON: Record<string, string> = {
  "Bug Report":       "🐛",
  "Feature Request":  "✨",
  "General Feedback": "💬",
  "Compliment":       "⭐",
};

async function handleFeedback(req: Request, res: Response) {
  const body = req.body ?? {};

  const userName   = (body.userName   ?? "Anonymous").toString().trim();
  const role       = (body.role       ?? "unknown").toString().trim();
  const category   = (body.category   ?? "General Feedback").toString().trim();
  const rating     = (body.rating     ?? "").toString().trim();
  const message    = (body.message    ?? "").toString().trim();

  if (!message) {
    res.status(400).json({ error: "Feedback message is required." });
    return;
  }

  const transporter = createTransporter();
  if (!transporter) {
    res.status(503).json({ error: "Email service not configured." });
    return;
  }

  const submittedAt = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    dateStyle: "full",
    timeStyle: "short",
  });

  const stars = rating ? "⭐".repeat(parseInt(rating, 10)) : "Not rated";
  const icon  = CATEGORY_ICON[category] ?? "💬";

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; background: #f9f9f9; border-radius: 8px; overflow: hidden; border: 1px solid #ddd;">
      <div style="background: #0A0A0A; padding: 28px 32px; text-align: center;">
        <h1 style="color: #34FF7A; margin: 0; font-size: 22px; letter-spacing: 1px;">THE LAWN SERVICES</h1>
        <p style="color: #888; margin: 6px 0 0; font-size: 13px;">App Feedback Report</p>
      </div>
      <div style="padding: 32px;">
        <div style="background: #e8f5e9; border-left: 4px solid #34FF7A; padding: 12px 16px; border-radius: 4px; font-size: 14px; color: #1b5e20; margin-bottom: 24px;">
          ${icon} New <strong>${category}</strong> submitted from the TheLawn app.
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 14px 0; font-size: 13px; color: #666; font-weight: bold; width: 38%;">From</td>
            <td style="padding: 14px 0; font-size: 14px; color: #111;">${userName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 14px 0; font-size: 13px; color: #666; font-weight: bold;">Account Type</td>
            <td style="padding: 14px 0; font-size: 14px; color: #111; text-transform: capitalize;">${role}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 14px 0; font-size: 13px; color: #666; font-weight: bold;">Category</td>
            <td style="padding: 14px 0; font-size: 14px; color: #111;">${icon} ${category}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 14px 0; font-size: 13px; color: #666; font-weight: bold;">App Rating</td>
            <td style="padding: 14px 0; font-size: 14px; color: #111;">${stars}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 14px 0; font-size: 13px; color: #666; font-weight: bold; vertical-align: top; padding-top: 16px;">Message</td>
            <td style="padding: 14px 0; font-size: 14px; color: #111; line-height: 1.6;">${message.replace(/\n/g, "<br>")}</td>
          </tr>
          <tr>
            <td style="padding: 14px 0; font-size: 13px; color: #666; font-weight: bold;">Photos</td>
            <td style="padding: 14px 0; font-size: 14px; color: #111;">${(req as any).files?.length ? `✅ ${(req as any).files.length} photo(s) attached below` : body.photoBase64 ? "✅ 1 photo attached below" : "No photos attached"}</td>
          </tr>
        </table>
        <div style="margin-top: 24px; padding: 12px 16px; background: #f0f0f0; border-radius: 6px; font-size: 12px; color: #777;">
          Submitted: ${submittedAt} ET
        </div>
      </div>
      <div style="background: #0A0A0A; padding: 16px 32px; text-align: center;">
        <p style="color: #555; font-size: 11px; margin: 0;">This is an automated message from The Lawn Services feedback system.</p>
      </div>
    </div>
  `;

  const attachments: nodemailer.Attachment[] = [];

  const files = (req as any).files as Express.Multer.File[] | undefined;
  if (files && files.length > 0) {
    for (const file of files) {
      attachments.push({
        filename: file.originalname || `photo.${file.mimetype.split("/")[1] || "jpg"}`,
        content: file.buffer,
        contentType: file.mimetype,
      });
    }
  } else if (body.photoBase64 && body.photoMimeType) {
    const base64Data = body.photoBase64.replace(/^data:[^;]+;base64,/, "");
    const ext = body.photoMimeType.split("/")[1] || "jpg";
    attachments.push({
      filename: body.photoFileName || `feedback-photo.${ext}`,
      content: Buffer.from(base64Data, "base64"),
      contentType: body.photoMimeType,
    });
  }

  try {
    await transporter.sendMail({
      from: `"The Lawn Services App" <${process.env.GMAIL_USER}>`,
      to: "TheLawnServices@gmail.com",
      subject: `${icon} App Feedback — ${category} from ${userName} (${role})`,
      html: htmlBody,
      attachments,
    });

    res.json({ success: true, message: "Feedback submitted successfully." });
  } catch (err: any) {
    console.error("Feedback email error:", err);
    res.status(500).json({ error: "Failed to send feedback. Please try again." });
  }
}

router.post("/", upload.array("photos", 5), handleFeedback);

export default router;
