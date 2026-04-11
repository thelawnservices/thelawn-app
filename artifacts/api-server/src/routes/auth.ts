import { Router } from "express";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { pool } from "../db";

const router = Router();

// ── Email helper ──────────────────────────────────────────────────
function createTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
}

// ── Ensure password_resets table exists ──────────────────────────
pool.query(`
  CREATE TABLE IF NOT EXISTS lawn_password_resets (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL,
    code        VARCHAR(6) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`).catch((e) => console.error("Failed to create lawn_password_resets:", e));

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const {
      username, role, password, displayName, email,
      phone = "", address = "", zipCode = "", city = "", state = "",
      businessName = "", services = "", yearsExperience = "",
    } = req.body as {
      username: string; role: string; password: string; displayName: string;
      email: string; phone?: string; address?: string; zipCode?: string;
      city?: string; state?: string; businessName?: string; services?: string;
      yearsExperience?: string;
    };

    if (!username || !role || !password || !displayName || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (!["customer", "landscaper"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ error: pwError });

    const existing = await pool.query(
      "SELECT id FROM lawn_users WHERE username = $1 AND role = $2",
      [username.toLowerCase().trim(), role]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Username already taken. Please choose another." });
    }

    const oppositeRole = role === "customer" ? "landscaper" : "customer";
    const emailConflict = await pool.query(
      "SELECT id FROM lawn_users WHERE email = $1 AND role = $2",
      [email.trim().toLowerCase(), oppositeRole]
    );
    if (emailConflict.rows.length > 0) {
      return res.status(409).json({
        error: `This email is already registered as a ${oppositeRole}. Each email can only belong to one account type.`,
      });
    }

    if (phone && phone.replace(/\D/g, "").length >= 7) {
      const phoneConflict = await pool.query(
        "SELECT id FROM lawn_users WHERE phone = $1 AND role = $2",
        [phone.trim(), oppositeRole]
      );
      if (phoneConflict.rows.length > 0) {
        return res.status(409).json({
          error: `This phone number is already registered as a ${oppositeRole}. Each phone number can only belong to one account type.`,
        });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO lawn_users
        (username, role, password_hash, display_name, email, phone, address, zip_code, city, state, business_name, services, years_experience)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id, username, role, display_name, email, phone, address, zip_code, city, state, business_name, services, years_experience, created_at`,
      [
        username.toLowerCase().trim(), role, passwordHash,
        displayName.trim(), email.trim(), phone.trim(),
        address.trim(), zipCode.trim(), city.trim(), state.trim(),
        businessName.trim(), services, yearsExperience.trim(),
      ]
    );

    const user = result.rows[0];
    return res.status(201).json({ user: sanitize(user) });
  } catch (err: any) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, password, role } = req.body as {
      username: string; password: string; role: string;
    };

    if (!username || !password || !role) {
      return res.status(400).json({ error: "Username, password, and role are required" });
    }

    const result = await pool.query(
      "SELECT * FROM lawn_users WHERE username = $1 AND role = $2",
      [username.toLowerCase().trim(), role]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Incorrect username or password" });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Incorrect username or password" });
    }

    return res.json({ user: sanitize(user) });
  } catch (err: any) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// POST /api/auth/change-password
router.post("/change-password", async (req, res) => {
  try {
    const { username, role, currentPassword, newPassword } = req.body as {
      username: string; role: string; currentPassword: string; newPassword: string;
    };
    if (!username || !role || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "All fields are required." });
    }
    const result = await pool.query(
      "SELECT * FROM lawn_users WHERE username = $1 AND role = $2",
      [username.toLowerCase().trim(), role]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Account not found." });
    }
    const user = result.rows[0];
    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }
    const pwError = validatePassword(newPassword);
    if (pwError) return res.status(400).json({ error: pwError });
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: "New password must be different from your current password." });
    }
    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      "UPDATE lawn_users SET password_hash = $1 WHERE id = $2",
      [newHash, user.id]
    );
    return res.json({ success: true });
  } catch (err: any) {
    console.error("Change password error:", err);
    return res.status(500).json({ error: "Failed to change password. Please try again." });
  }
});

// POST /api/auth/forgot-password
// Accepts: { identifier, role, method }
//   method = "email"  → look up by email address
//   method = "phone"  → look up by phone number (code sent to account's email)
router.post("/forgot-password", async (req, res) => {
  try {
    const { identifier, role, method } = req.body as {
      identifier: string; role: string; method: "email" | "phone";
    };

    if (!identifier || !role || !method) {
      return res.status(400).json({ error: "All fields are required." });
    }
    if (!["customer", "landscaper"].includes(role)) {
      return res.status(400).json({ error: "Invalid role." });
    }

    // Look up the user
    let userResult;
    if (method === "email") {
      userResult = await pool.query(
        "SELECT * FROM lawn_users WHERE email = $1 AND role = $2",
        [identifier.trim().toLowerCase(), role]
      );
    } else {
      // phone: digits only for lookup
      const digits = identifier.replace(/\D/g, "");
      userResult = await pool.query(
        "SELECT * FROM lawn_users WHERE REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = $1 AND role = $2",
        [digits, role]
      );
    }

    // Always return success to prevent user enumeration
    if (userResult.rows.length === 0) {
      return res.json({ success: true, resetId: null });
    }

    const user = userResult.rows[0];
    if (!user.email) {
      return res.json({ success: true, resetId: null });
    }

    // Invalidate any previous unused codes for this user
    await pool.query(
      "UPDATE lawn_password_resets SET used = true WHERE user_id = $1 AND used = false",
      [user.id]
    );

    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const insertResult = await pool.query(
      "INSERT INTO lawn_password_resets (user_id, code, expires_at) VALUES ($1, $2, $3) RETURNING id",
      [user.id, code, expiresAt]
    );
    const resetId = insertResult.rows[0].id;

    // Send the email
    const transporter = createTransporter();
    if (transporter) {
      const displayName = user.display_name || user.username;
      const deliveryNote = method === "phone"
        ? `<p style="color:#aaa;font-size:13px;">You requested this code using your registered phone number. It is being delivered to the email address linked to your account.</p>`
        : "";

      await transporter.sendMail({
        from: `"The Lawn Services" <${process.env.GMAIL_USER}>`,
        to: user.email,
        subject: "Your Password Reset Code — The Lawn Services",
        html: `
          <div style="font-family:Arial,sans-serif;background:#0A0A0A;padding:32px;border-radius:12px;max-width:480px;margin:auto;">
            <div style="text-align:center;margin-bottom:24px;">
              <span style="font-size:32px;">🌿</span>
              <h1 style="color:#34FF7A;margin:8px 0 4px;font-size:22px;">The Lawn Services</h1>
            </div>
            <h2 style="color:#ffffff;font-size:18px;margin-bottom:8px;">Password Reset Code</h2>
            <p style="color:#cccccc;font-size:14px;line-height:1.6;">Hi ${displayName},</p>
            <p style="color:#cccccc;font-size:14px;line-height:1.6;">
              We received a request to reset your password. Use the code below to continue.
              This code expires in <strong style="color:#fff;">15 minutes</strong>.
            </p>
            ${deliveryNote}
            <div style="background:#1A1A1A;border:1px solid #222;border-radius:10px;padding:24px;text-align:center;margin:24px 0;">
              <span style="font-size:36px;font-weight:700;letter-spacing:10px;color:#34FF7A;">${code}</span>
            </div>
            <p style="color:#888;font-size:12px;line-height:1.6;">
              If you didn't request a password reset, you can safely ignore this email.
              Your password will not be changed until you use this code.
            </p>
            <hr style="border-color:#222;margin:20px 0;" />
            <p style="color:#555;font-size:11px;text-align:center;">
              © ${new Date().getFullYear()} The Lawn Services · Do not reply to this email
            </p>
          </div>
        `,
      });
    }

    return res.json({ success: true, resetId });
  } catch (err: any) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ error: "Failed to send reset code. Please try again." });
  }
});

// POST /api/auth/verify-reset-code
// Accepts: { resetId, code }
router.post("/verify-reset-code", async (req, res) => {
  try {
    const { resetId, code } = req.body as { resetId: number; code: string };
    if (!resetId || !code) {
      return res.status(400).json({ error: "Reset ID and code are required." });
    }

    const result = await pool.query(
      "SELECT * FROM lawn_password_resets WHERE id = $1",
      [resetId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid reset request." });
    }

    const reset = result.rows[0];

    if (reset.used) {
      return res.status(400).json({ error: "This code has already been used." });
    }
    if (new Date() > new Date(reset.expires_at)) {
      return res.status(400).json({ error: "This code has expired. Please request a new one." });
    }
    if (reset.code !== code.trim()) {
      return res.status(400).json({ error: "Incorrect code. Please check and try again." });
    }

    return res.json({ valid: true });
  } catch (err: any) {
    console.error("Verify reset code error:", err);
    return res.status(500).json({ error: "Verification failed. Please try again." });
  }
});

// POST /api/auth/reset-password
// Accepts: { resetId, code, newPassword }
router.post("/reset-password", async (req, res) => {
  try {
    const { resetId, code, newPassword } = req.body as {
      resetId: number; code: string; newPassword: string;
    };
    if (!resetId || !code || !newPassword) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const result = await pool.query(
      "SELECT * FROM lawn_password_resets WHERE id = $1",
      [resetId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid reset request." });
    }

    const reset = result.rows[0];

    if (reset.used) {
      return res.status(400).json({ error: "This code has already been used." });
    }
    if (new Date() > new Date(reset.expires_at)) {
      return res.status(400).json({ error: "This code has expired. Please request a new one." });
    }
    if (reset.code !== code.trim()) {
      return res.status(400).json({ error: "Incorrect code. Please check and try again." });
    }

    const pwError = validatePassword(newPassword);
    if (pwError) return res.status(400).json({ error: pwError });

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query("UPDATE lawn_users SET password_hash = $1 WHERE id = $2", [newHash, reset.user_id]);
    await pool.query("UPDATE lawn_password_resets SET used = true WHERE id = $1", [resetId]);

    return res.json({ success: true });
  } catch (err: any) {
    console.error("Reset password error:", err);
    return res.status(500).json({ error: "Failed to reset password. Please try again." });
  }
});

function validatePassword(pw: string): string | null {
  if (pw.length < 8)                return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pw))           return "Password must include at least one uppercase letter.";
  if (!/[a-z]/.test(pw))           return "Password must include at least one lowercase letter.";
  if (!/[0-9]/.test(pw))           return "Password must include at least one number.";
  if (!/[^A-Za-z0-9]/.test(pw))   return "Password must include at least one special character (e.g. !@#$%).";
  return null;
}

// POST /api/auth/apple — find-or-create account from Apple Sign In credential
// Accepts optional `role` ("customer" | "landscaper"), defaults to "customer"
router.post("/apple", async (req, res) => {
  try {
    const { appleId, email, givenName, familyName, role: rawRole } = req.body as {
      appleId: string; email?: string; givenName?: string; familyName?: string; role?: string;
    };
    if (!appleId) return res.status(400).json({ error: "Missing Apple credential" });

    const role = rawRole === "landscaper" ? "landscaper" : "customer";

    // Check if user with this Apple ID already exists for this role
    const existing = await pool.query(
      "SELECT * FROM lawn_users WHERE apple_id = $1 AND role = $2",
      [appleId, role]
    );
    if (existing.rows.length > 0) {
      return res.json({ user: sanitize(existing.rows[0]), isNewUser: false });
    }

    // First-time sign in — create account
    const displayName = [givenName, familyName].filter(Boolean).join(" ").trim() ||
      (role === "landscaper" ? "New Landscaper" : "Apple User");
    const safeEmail = email?.trim().toLowerCase() || `apple_${appleId.slice(0, 8)}@noemail.thelawn`;

    // For landscapers, derive a businessName from their display name
    const businessName = role === "landscaper" ? `${displayName} Landscaping` : "";

    // Generate a unique username from name or apple ID fragment
    const rolePrefix = role === "landscaper" ? "lspro" : "apple";
    const baseUsername = `${rolePrefix}_${appleId.slice(0, 10).replace(/[^a-z0-9]/gi, "").toLowerCase()}`;
    let username = baseUsername;
    let attempt = 0;
    while (true) {
      const taken = await pool.query(
        "SELECT id FROM lawn_users WHERE username = $1 AND role = $2",
        [username, role]
      );
      if (taken.rows.length === 0) break;
      attempt++;
      username = `${baseUsername}${attempt}`;
    }

    // Random password hash — Apple users won't log in with password
    const passwordHash = await bcrypt.hash(`apple_${appleId}_${Date.now()}`, 12);

    const result = await pool.query(
      `INSERT INTO lawn_users
        (username, role, password_hash, display_name, email, business_name, apple_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [username, role, passwordHash, displayName, safeEmail, businessName, appleId]
    );

    return res.status(201).json({ user: sanitize(result.rows[0]), isNewUser: true });
  } catch (err: any) {
    console.error("Apple sign in error:", err);
    return res.status(500).json({ error: "Sign in failed. Please try again." });
  }
});

function sanitize(u: any) {
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    displayName: u.display_name,
    email: u.email,
    phone: u.phone,
    address: u.address,
    zipCode: u.zip_code,
    city: u.city,
    state: u.state,
    businessName: u.business_name,
    services: u.services,
    yearsExperience: u.years_experience,
    createdAt: u.created_at,
    appleId: u.apple_id ?? undefined,
  };
}

// POST /api/auth/update-profile
// Used by Apple Sign In users to complete registration info
router.post("/update-profile", async (req, res) => {
  try {
    const { username, role, phone, address, city, state, zipCode, services, yearsExperience, displayName, businessName } = req.body as {
      username: string; role: string;
      phone?: string; address?: string; city?: string; state?: string;
      zipCode?: string; services?: string; yearsExperience?: string;
      displayName?: string; businessName?: string;
    };
    if (!username || !role) return res.status(400).json({ error: "Missing username or role" });
    const result = await pool.query(
      `UPDATE lawn_users
       SET phone = COALESCE(NULLIF($3,''), phone),
           address = COALESCE(NULLIF($4,''), address),
           city = COALESCE(NULLIF($5,''), city),
           state = COALESCE(NULLIF($6,''), state),
           zip_code = COALESCE(NULLIF($7,''), zip_code),
           services = COALESCE(NULLIF($8,''), services),
           years_experience = COALESCE(NULLIF($9,''), years_experience),
           display_name = COALESCE(NULLIF($10,''), display_name),
           business_name = COALESCE(NULLIF($11,''), business_name)
       WHERE username = $1 AND role = $2
       RETURNING id, username, role, display_name, email, phone, address, zip_code, city, state, business_name, services, years_experience, created_at`,
      [username, role, phone ?? "", address ?? "", city ?? "", state ?? "", zipCode ?? "", services ?? "", yearsExperience ?? "", displayName ?? "", businessName ?? ""]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });
    return res.json({ user: sanitize(result.rows[0]) });
  } catch (err) {
    console.error("update-profile error:", err);
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

// POST /api/auth/delete-account
router.post("/delete-account", async (req, res) => {
  try {
    const { username, role, password } = req.body as {
      username: string; role: string; password?: string;
    };
    if (!username || !role) return res.status(400).json({ error: "Missing username or role" });

    const result = await pool.query(
      `SELECT password_hash, apple_id FROM lawn_users WHERE username = $1 AND role = $2`,
      [username, role]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Account not found" });

    const { password_hash, apple_id } = result.rows[0];

    // Apple-only users don't know their generated password — skip password check
    if (!apple_id) {
      if (!password) return res.status(401).json({ error: "Password is required to delete your account" });
      const match = await bcrypt.compare(password, password_hash);
      if (!match) return res.status(401).json({ error: "Incorrect password" });
    }

    await pool.query(`DELETE FROM lawn_users WHERE username = $1 AND role = $2`, [username, role]);
    return res.json({ success: true });
  } catch (err) {
    console.error("delete-account error:", err);
    return res.status(500).json({ error: "Failed to delete account" });
  }
});

export default router;
