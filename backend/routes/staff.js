// routes/staff.js
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { dbPromise } from "../server.js";
dotenv.config();

const router = express.Router();
const SALT_ROUNDS = 10;

// ✅ Middleware: Admin-only
const verifyAdmin = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "No token provided" });

  const token = auth.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || decoded.role !== "admin")
      return res.status(403).json({ error: "Forbidden" });
    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT error:", err.message);
    return res.status(401).json({ error: "Invalid token" });
  }
};

// ✅ Get all users (admin, staff, owner)
router.get("/", verifyAdmin, async (req, res) => {
  try {
    const db = await dbPromise;
    const rows = await db.all(`
      SELECT 
        id AS StaffID,
        name,
        email,
        role,
        COALESCE(profile_pic, 'defaultProfile.png') AS profile_pic,
        1 AS isActive,
        datetime(created_at) AS createdAt
      FROM users
      ORDER BY created_at DESC
    `);
    res.json({ data: rows });
  } catch (err) {
    console.error("Fetch staff error:", err);
    res.status(500).json({ error: "Failed to fetch staff" });
  }
});

// ✅ Create a new staff (or admin/owner)
router.post("/", verifyAdmin, async (req, res) => {
  try {
    const { name, email, role = "staff", password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "Missing required fields" });

    const db = await dbPromise;
    const existing = await db.get("SELECT * FROM users WHERE email = ?", [email]);
    if (existing) return res.status(400).json({ error: "Email already exists" });

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    await db.run(
      `INSERT INTO users (name, email, password, role, profile_pic)
       VALUES (?, ?, ?, ?, 'defaultProfile.png')`,
      [name, email, hashed, role]
    );

    res.status(201).json({ message: `✅ ${role} account created successfully` });
  } catch (err) {
    console.error("Create staff error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Update staff/user details (name, email, and role)
router.put("/:id", verifyAdmin, async (req, res) => {
  try {
    const { name, role, email } = req.body;
    if (!name || !role || !email)
      return res.status(400).json({ error: "Name, email, and role are required" });

    const db = await dbPromise;
    const existing = await db.get("SELECT * FROM users WHERE id = ?", [req.params.id]);
    if (!existing) return res.status(404).json({ error: "User not found" });

    // prevent duplicate emails (for different users)
    const emailExists = await db.get(
      "SELECT id FROM users WHERE email = ? AND id != ?",
      [email, req.params.id]
    );
    if (emailExists)
      return res.status(400).json({ error: "Email already in use by another account" });

    await db.run(
      "UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?",
      [name, email, role, req.params.id]
    );

    const updated = await db.get("SELECT id, name, email, role FROM users WHERE id = ?", [
      req.params.id,
    ]);

    res.json({ message: "✅ User updated successfully", data: updated });
  } catch (err) {
    console.error("Update staff error:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

export default router;
