import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { dbPromise } from "../server.js";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

// ✅ Middleware to verify token for /me route
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ error: "No authorization token provided" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

// ✅ REGISTER
router.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const db = await dbPromise;
    const existing = await db.get("SELECT * FROM users WHERE email = ?", [email]);
    if (existing) return res.status(400).json({ error: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const userRole = role || "owner";

    const result = await db.run(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hashed, userRole]
    );

    // ✅ Notify admins/staff when a new owner registers
    if (userRole === "owner") {
      const io = req.app.get("io");
      if (io) {
        io.emit("adminNotification", {
          message: `🆕 New business owner registered: ${name}`,
        });
      }
    }

    res.json({ message: "✅ User registered successfully" });
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// ✅ LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const db = await dbPromise;
    const user = await db.get("SELECT * FROM users WHERE email = ?", [email]);

    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ✅ GET /api/auth/me — Validate and return user info
router.get("/me", verifyToken, async (req, res) => {
  try {
    const db = await dbPromise;
    const user = await db.get("SELECT id, name, email, role FROM users WHERE id = ?", [
      req.user.id,
    ]);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("❌ /me route error:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

export default router;
