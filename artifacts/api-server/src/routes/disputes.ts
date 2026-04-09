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

async function handleDispute(req: Request, res: Response) {
  const body = req.body ?? {};

  const purchaseId     = (body.purchaseId     ?? "").toString().trim();
  const customerName   = (body.customerName   ?? "").toString().trim();
  const serviceAddress = (body.serviceAddress ?? "").toString().trim();
  const phoneNumber    = (body.phoneNumber    ?? "").toString().trim();
  const landscaperName = (body.landscaperName ?? "").toString().trim();
  const serviceDone    = (body.serviceDone    ?? "").toString().trim();
  const additionalNotes = (body.additionalNotes ?? "").toString().trim();

  if (!customerName || !serviceAddress || !phoneNumber || !landscaperName || !serviceDone) {
    res.status(400).json({ error: "Missing required fields." });
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

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; background: #f9f9f9; border-radius: 8px; overflow: hidden; border: 1px solid #ddd;">
      <div style="background: #0A0A0A; padding: 28px 32px; text-align: center;">
        <h1 style="color: #34FF7A; margin: 0; font-size: 22px; letter-spacing: 1px;">THE LAWN SERVICES</h1>
        <p style="color: #888; margin: 6px 0 0; font-size: 13px;">Customer Dispute Report</p>
      </div>
      <div style="padding: 32px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td colspan="2" style="padding-bottom: 16px;">
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px 16px; border-radius: 4px; font-size: 14px; color: #664d03;">
              ⚠️ A new dispute has been submitted and requires your attention.
            </div>
          </td></tr>

          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 14px 0; font-size: 13px; color: #666; font-weight: bold; width: 40%;">Stripe Purchase ID</td>
            <td style="padding: 14px 0; font-size: 14px; color: #111; font-family: monospace;">${purchaseId || "Not provided"}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 14px 0; font-size: 13px; color: #666; font-weight: bold;">Customer Name</td>
            <td style="padding: 14px 0; font-size: 14px; color: #111;">${customerName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 14px 0; font-size: 13px; color: #666; font-weight: bold;">Service Address</td>
            <td style="padding: 14px 0; font-size: 14px; color: #111;">${serviceAddress}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 14px 0; font-size: 13px; color: #666; font-weight: bold;">Phone Number</td>
            <td style="padding: 14px 0; font-size: 14px; color: #111;">${phoneNumber}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 14px 0; font-size: 13px; color: #666; font-weight: bold;">Landscaper Involved</td>
            <td style="padding: 14px 0; font-size: 14px; color: #111;">${landscaperName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 14px 0; font-size: 13px; color: #666; font-weight: bold;">Service Performed</td>
            <td style="padding: 14px 0; font-size: 14px; color: #111;">${serviceDone}</td>
          </tr>
          ${additionalNotes ? `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 14px 0; font-size: 13px; color: #666; font-weight: bold;">Additional Notes</td>
            <td style="padding: 14px 0; font-size: 14px; color: #111;">${additionalNotes}</td>
          </tr>` : ""}
          <tr>
            <td style="padding: 14px 0; font-size: 13px; color: #666; font-weight: bold;">Screenshot</td>
            <td style="padding: 14px 0; font-size: 14px; color: #111;">${(req as any).file ? "✅ Attached below" : "No screenshot provided"}</td>
          </tr>
        </table>

        <div style="margin-top: 24px; padding: 12px 16px; background: #f0f0f0; border-radius: 6px; font-size: 12px; color: #777;">
          Submitted: ${submittedAt} ET
        </div>
      </div>
      <div style="background: #0A0A0A; padding: 16px 32px; text-align: center;">
        <p style="color: #555; font-size: 11px; margin: 0;">This is an automated message from The Lawn Services dispute system.</p>
      </div>
    </div>
  `;

  const attachments: nodemailer.Attachment[] = [];

  const file = (req as any).file;
  if (file) {
    attachments.push({
      filename: file.originalname || `screenshot.${file.mimetype.split("/")[1] || "jpg"}`,
      content: file.buffer,
      contentType: file.mimetype,
    });
  } else if (body.screenshotBase64 && body.screenshotMimeType) {
    const base64Data = body.screenshotBase64.replace(/^data:[^;]+;base64,/, "");
    const ext = body.screenshotMimeType.split("/")[1] || "jpg";
    attachments.push({
      filename: body.screenshotFileName || `screenshot.${ext}`,
      content: Buffer.from(base64Data, "base64"),
      contentType: body.screenshotMimeType,
    });
  }

  try {
    await transporter.sendMail({
      from: `"The Lawn Services Disputes" <${process.env.GMAIL_USER}>`,
      to: "TheLawnServices@gmail.com",
      subject: `🚨 Dispute Filed — ${customerName} vs ${landscaperName} (${serviceDone})`,
      html: htmlBody,
      attachments,
    });

    res.json({ success: true, message: "Dispute submitted successfully." });
  } catch (err: any) {
    console.error("Dispute email error:", err);
    res.status(500).json({ error: "Failed to send dispute report. Please try again." });
  }
}

// multipart/form-data (native mobile)
router.post("/", upload.single("screenshot"), handleDispute);

export default router;
