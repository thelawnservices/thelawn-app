import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey:  process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

router.post("/", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = req.body as {
      imageBase64?: string;
      mimeType?: string;
    };

    if (!imageBase64) {
      res.status(400).json({ ok: false, reason: "No image provided" });
      return;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are a content moderation AI for a professional landscaping marketplace app called TheLawnServices.

Review this image and decide if it is APPROPRIATE or INAPPROPRIATE for a business profile or portfolio.

APPROPRIATE: landscaping work, yards, gardens, lawns, tools, team photos, nature, professional business photos.
INAPPROPRIATE: nudity, sexual content, violence, gore, hate symbols, illegal content, adult material, offensive material.

Respond with ONLY a JSON object in this exact format:
{"approved": true, "reason": ""}
or
{"approved": false, "reason": "Brief reason why"}

Do not include any other text.`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: "low",
              },
            },
          ],
        },
      ],
      max_tokens: 100,
    });

    const text = response.choices[0]?.message?.content?.trim() ?? '{"approved":true,"reason":""}';

    let result: { approved: boolean; reason: string };
    try {
      result = JSON.parse(text);
    } catch {
      result = { approved: true, reason: "" };
    }

    res.json(result);
  } catch (err) {
    console.error("Image moderation error:", err);
    res.json({ approved: true, reason: "" });
  }
});

export default router;
