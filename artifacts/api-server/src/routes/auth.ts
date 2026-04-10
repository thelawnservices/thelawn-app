import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db";

const router = Router();

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

    // Strong password enforcement
    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ error: pwError });

    // Check username already taken for same role
    const existing = await pool.query(
      "SELECT id FROM lawn_users WHERE username = $1 AND role = $2",
      [username.toLowerCase().trim(), role]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Username already taken. Please choose another." });
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

function validatePassword(pw: string): string | null {
  if (pw.length < 8)                return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pw))           return "Password must include at least one uppercase letter.";
  if (!/[a-z]/.test(pw))           return "Password must include at least one lowercase letter.";
  if (!/[0-9]/.test(pw))           return "Password must include at least one number.";
  if (!/[^A-Za-z0-9]/.test(pw))   return "Password must include at least one special character (e.g. !@#$%).";
  return null;
}

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
  };
}

export default router;
