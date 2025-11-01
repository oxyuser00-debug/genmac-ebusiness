import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { dbPromise } from "../server.js";

dotenv.config();
const router = express.Router();
let io; // Socket.IO instance

// ✅ Function to set Socket.IO instance from server.js
export const setSocketIO = (socketIO) => {
  io = socketIO;
};

// ✅ setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../uploads")),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});
const upload = multer({ storage });

// ✅ Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No authorization token" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("❌ Token verification error:", err.message);
    return res.status(403).json({ error: "Invalid token" });
  }
};

// ✅ POST /api/applications — Create new application
router.post(
  "/",
  verifyToken,
  upload.fields([
    { name: "barangay_clearance", maxCount: 1 },
    { name: "dti_certificate", maxCount: 1 },
    { name: "lease_contract", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const db = await dbPromise;
      const { business_name, business_type, address, fee } = req.body;
      const files = req.files;

      const barangay_clearance = files.barangay_clearance?.[0].filename || null;
      const dti_certificate = files.dti_certificate?.[0].filename || null;
      const lease_contract = files.lease_contract?.[0].filename || null;

      const result = await db.run(
        `INSERT INTO applications (
          user_id, business_name, business_type, address,
          barangay_clearance, dti_certificate, lease_contract, status, fee
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, business_name, business_type, address, barangay_clearance, dti_certificate, lease_contract, "pending", fee || 0]
      );

      const newApplication = {
        id: result.lastID,
        user_id: req.user.id,
        business_name,
        business_type,
        address,
        barangay_clearance,
        dti_certificate,
        lease_contract,
        fee: fee || 0,
        status: "pending",
        created_at: new Date().toISOString(),
      };

      // ✅ Notify admins/staff
      if (io) {
        io.emit("adminNotification", {
          message: `New application submitted: ${business_name}`,
          applicationId: result.lastID,
          status: "new",
        });
        console.log("✅ adminNotification emitted for new application");
      }

      res.json({ message: "✅ Application submitted successfully!", application: newApplication });
    } catch (err) {
      console.error("Database insert error:", err);
      res.status(500).json({ error: "Failed to save application." });
    }
  }
);

// ✅ GET /api/applications — Fetch all applications
router.get("/", verifyToken, async (req, res) => {
  try {
    const db = await dbPromise;

    // Admin/Staff can view all
    if (req.user.role === "admin" || req.user.role === "staff") {
      const apps = await db.all(`
        SELECT 
          a.id,
          a.user_id,
          u.name AS owner_name,
          a.business_name,
          a.business_type,
          a.address,
          a.barangay_clearance,
          a.dti_certificate,
          a.lease_contract,
          a.status,
          a.fee,
          a.created_at
        FROM applications a
        JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC
      `);

      const withFileURLs = apps.map(a => ({
        ...a,
        barangay_clearance: a.barangay_clearance
          ? `http://localhost:5000/uploads/${a.barangay_clearance}`
          : null,
        dti_certificate: a.dti_certificate
          ? `http://localhost:5000/uploads/${a.dti_certificate}`
          : null,
        lease_contract: a.lease_contract
          ? `http://localhost:5000/uploads/${a.lease_contract}`
          : null,
      }));

      return res.json(withFileURLs);
    }

    // Owner: view only own apps
    const apps = await db.all(
      `SELECT 
        id, user_id, business_name, business_type, address,
        barangay_clearance, dti_certificate, lease_contract, 
        status, fee, created_at
       FROM applications 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    const withFileURLs = apps.map(a => ({
      ...a,
      barangay_clearance: a.barangay_clearance
        ? `http://localhost:5000/uploads/${a.barangay_clearance}`
        : null,
      dti_certificate: a.dti_certificate
        ? `http://localhost:5000/uploads/${a.dti_certificate}`
        : null,
      lease_contract: a.lease_contract
        ? `http://localhost:5000/uploads/${a.lease_contract}`
        : null,
    }));

    res.json(withFileURLs);
  } catch (err) {
    console.error("❌ Fetch all applications error:", err.message);
    res.status(500).json({ error: "Failed to load applications" });
  }
});

// ✅ GET /api/applications/:id — Fetch single application by ID
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const db = await dbPromise;
    const app = await db.get("SELECT * FROM applications WHERE id = ?", [req.params.id]);

    if (!app) return res.status(404).json({ error: "Application not found" });
    if (req.user.role === "owner" && app.user_id !== req.user.id)
      return res.status(403).json({ error: "Unauthorized" });

    res.json(app);
  } catch (err) {
    console.error("❌ Fetch application error:", err.message);
    res.status(500).json({ error: "Failed to load application details" });
  }
});

// ✅ DELETE /api/applications/:id — Delete application
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const db = await dbPromise;
    const app = await db.get("SELECT * FROM applications WHERE id = ?", [req.params.id]);

    if (!app) return res.status(404).json({ error: "Application not found" });
    if (req.user.role === "owner" && app.user_id !== req.user.id)
      return res.status(403).json({ error: "Unauthorized" });

    await db.run("DELETE FROM applications WHERE id = ?", [req.params.id]);
    res.json({ message: "✅ Application deleted successfully" });
  } catch (err) {
    console.error("❌ Delete application error:", err.message);
    res.status(500).json({ error: "Failed to delete application" });
  }
});

// ✅ PUT /api/applications/:id — Update application
router.put(
  "/:id",
  verifyToken,
  upload.fields([
    { name: "barangay_clearance", maxCount: 1 },
    { name: "dti_certificate", maxCount: 1 },
    { name: "lease_contract", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const db = await dbPromise;
      const app = await db.get("SELECT * FROM applications WHERE id = ?", [req.params.id]);

      if (!app) return res.status(404).json({ error: "Application not found" });
      if (req.user.role === "owner" && app.user_id !== req.user.id)
        return res.status(403).json({ error: "Unauthorized" });

      const { business_name, business_type, address, fee } = req.body;
      const files = req.files;

      const barangay_clearance =
        files.barangay_clearance?.[0].filename || app.barangay_clearance;
      const dti_certificate =
        files.dti_certificate?.[0].filename || app.dti_certificate;
      const lease_contract =
        files.lease_contract?.[0].filename || app.lease_contract;

      // ✅ Always reset to "pending" if owner edits
      const newStatus = req.user.role === "owner" ? "pending" : app.status;

      await db.run(
        `UPDATE applications SET 
          business_name = ?, 
          business_type = ?, 
          address = ?, 
          barangay_clearance = ?, 
          dti_certificate = ?, 
          lease_contract = ?, 
          fee = ?, 
          status = ?, 
          updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?`,
        [
          business_name,
          business_type,
          address,
          barangay_clearance,
          dti_certificate,
          lease_contract,
          fee || 0,
          newStatus,
          req.params.id,
        ]
      );

      // ✅ Optional: notify admin/staff about resubmission
      if (req.user.role === "owner" && io) {
        io.emit("adminNotification", {
          message: `Application "${business_name}" was updated and set to pending.`,
          applicationId: req.params.id,
          status: "pending",
        });
        console.log("📢 Application re-submitted notification sent to admins.");
      }

      res.json({
        message: `✅ Application updated successfully${
          req.user.role === "owner" ? " and set to pending." : "."
        }`,
      });
    } catch (err) {
      console.error("❌ Update application error:", err.message);
      res.status(500).json({ error: "Failed to update application" });
    }
  }
);

// ✅ PUT /api/applications/:id/status — Update application status (owner notification + remarks)
router.put("/:id/status", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { status, remarks, fee } = req.body;

  try {
    const db = await dbPromise;

    // Update status + fee if approved
    await db.run(
      `UPDATE applications SET status = ?, fee = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, fee || 0, id]
    );

    // Log staff action if not owner
    if (req.user.role !== "owner") {
      await db.run(
        `INSERT INTO staff_actions (staff_id, application_id, action, remarks)
         VALUES (?, ?, ?, ?)`,
        [req.user.id, id, status, remarks || null]
      );
    }

    const owner = await db.get(
      `SELECT u.id AS ownerId, u.name AS ownerName, a.business_name
       FROM applications a
       JOIN users u ON a.user_id = u.id
       WHERE a.id = ?`,
      [id]
    );

    if (io && owner) {
      io.to(`user_${owner.ownerId}`).emit("ownerNotification", {
        message: `Your application "${owner.business_name}" status has been updated to ${status}.`,
        applicationId: id,
        status,
      });
      console.log(`✅ ownerNotification sent to user_${owner.ownerId}`);
    }

    res.json({ message: "Application status updated successfully." });
  } catch (err) {
    console.error("❌ Update status error:", err.message);
    res.status(500).json({ error: "Failed to update application status" });
  }
});


/* ---------------- Fetch All Payments (Admin View) ---------------- */
router.get("/", verifyToken, async (req, res) => {
  try {
    const db = await dbPromise;
    const rows = await db.all(`
      SELECT 
        p.id,
        p.transaction_id,
        p.amount,
        p.status,
        p.payment_date,
        a.business_name,
        u.name AS owner_name
      FROM payments p
      JOIN applications a ON p.application_id = a.id
      JOIN users u ON a.user_id = u.id
      ORDER BY p.payment_date DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("❌ Fetch all payments error:", err.message);
    res.status(500).json({ error: "Failed to fetch payments." });
  }
});


export default router;