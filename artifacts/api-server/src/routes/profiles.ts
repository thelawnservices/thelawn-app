import { Router } from "express";
import multer from "multer";
import { pool } from "../db";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

// PUT /api/profiles/avatar
router.put("/avatar", upload.single("image"), async (req, res) => {
  const { username, role } = req.body as { username: string; role: string };
  if (!username || !role || !req.file) {
    return res.status(400).json({ error: "Missing username, role, or image" });
  }
  const b64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
  try {
    await pool.query(
      "UPDATE lawn_users SET avatar_base64 = $1 WHERE username = $2 AND role = $3",
      [b64, username.toLowerCase().trim(), role]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error("Save avatar error:", err);
    return res.status(500).json({ error: "Failed to save avatar" });
  }
});

// PUT /api/profiles/banner
router.put("/banner", upload.single("image"), async (req, res) => {
  const { username, role } = req.body as { username: string; role: string };
  if (!username || !role || !req.file) {
    return res.status(400).json({ error: "Missing username, role, or image" });
  }
  const b64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
  try {
    await pool.query(
      "UPDATE lawn_users SET banner_base64 = $1 WHERE username = $2 AND role = $3",
      [b64, username.toLowerCase().trim(), role]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error("Save banner error:", err);
    return res.status(500).json({ error: "Failed to save banner" });
  }
});

// GET /api/profiles/:username/:role/images
router.get("/:username/:role/images", async (req, res) => {
  const { username, role } = req.params;
  try {
    const result = await pool.query(
      "SELECT avatar_base64, banner_base64 FROM lawn_users WHERE username = $1 AND role = $2",
      [username.toLowerCase().trim(), role]
    );
    if (result.rows.length === 0) {
      return res.json({ avatar: null, banner: null });
    }
    const row = result.rows[0];
    return res.json({
      avatar: row.avatar_base64 || null,
      banner: row.banner_base64 || null,
    });
  } catch (err) {
    console.error("Fetch profile images error:", err);
    return res.status(500).json({ error: "Failed to fetch images" });
  }
});

export default router;
