// --- existing imports and setup stay the same ---
import express from "express";
import { dbPromise } from "../server.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Multer config (unchanged)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads/profiles"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});
const upload = multer({ storage });

// ✅ JWT verify middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ error: "No authorization token" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Token verification error:", err.message);
    return res.status(403).json({ error: "Invalid token" });
  }
};

// ✅ GET /api/users/me
router.get("/me", verifyToken, async (req, res) => {
  try {
    const db = await dbPromise;
    const user = await db.get(
      "SELECT id, name, email, role, profile_pic FROM users WHERE id = ?",
      [req.user.id]
    );
    res.json(user);
  } catch (err) {
    console.error("Fetch user error:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// ✅ PUT /api/users/:id (update own profile)
router.put("/:id", verifyToken, upload.single("profile_pic"), async (req, res) => {
  try {
    const { id } = req.params;
    const db = await dbPromise;
    if (req.user.id !== Number(id))
      return res.status(403).json({ error: "Unauthorized" });

    const user = await db.get("SELECT * FROM users WHERE id = ?", [id]);
    if (!user) return res.status(404).json({ error: "User not found" });

    const { name, password } = req.body;
    let hashedPassword = user.password;

    if (password && password.trim() !== "") {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const profile_pic = req.file
      ? req.file.filename
      : user.profile_pic || "defaultProfile.png";

    await db.run(
      `UPDATE users SET name = ?, password = ?, profile_pic = ? WHERE id = ?`,
      [name, hashedPassword, profile_pic, id]
    );

    res.json({ message: "✅ Profile updated successfully" });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});


// ==========================
// 🔽 NEW ROUTES BELOW 🔽
// ==========================

// ✅ Get users list based on role
router.get("/", verifyToken, async (req, res) => {
  try {
    const db = await dbPromise;
    const role = req.user.role;

    let query = "SELECT id, name, email, role, profile_pic, created_at FROM users";
    if (role === "staff") {
      query += " WHERE role = 'owner'";
    }
    query += " ORDER BY created_at DESC";

    const users = await db.all(query);
    res.json({ data: users });
  } catch (err) {
    console.error("Fetch all users error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ✅ Edit staff (admin only)
router.put("/admin/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ error: "Forbidden" });

    const db = await dbPromise;
    const { id } = req.params;
    const { name, email } = req.body;

    const target = await db.get("SELECT role FROM users WHERE id = ?", [id]);
    if (!target) return res.status(404).json({ error: "User not found" });
    if (target.role !== "staff")
      return res.status(400).json({ error: "Only staff can be edited" });

    await db.run("UPDATE users SET name = ?, email = ? WHERE id = ?", [
      name,
      email,
      id,
    ]);

    res.json({ message: "✅ Staff updated successfully" });
  } catch (err) {
    console.error("Update staff error:", err);
    res.status(500).json({ error: "Failed to update staff" });
  }
});

// ✅ Reset staff password (admin only)
router.patch("/admin/:id/password", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ error: "Forbidden" });

    const { password } = req.body;
    if (!password) return res.status(400).json({ error: "Password required" });

    const hashed = await bcrypt.hash(password, 10);
    const db = await dbPromise;
    await db.run("UPDATE users SET password = ? WHERE id = ?", [
      hashed,
      req.params.id,
    ]);

    res.json({ message: "✅ Password reset successfully" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

export default router;
