import express from "express";
import { dbPromise } from "../server.js";

const router = express.Router();

/* ------------------ Overview ------------------ */
router.get("/overview", async (req, res) => {
  try {
    const db = await dbPromise;
    const [
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      permitIssuedApplications,
      totalOwners,
    ] = await Promise.all([
      db.get("SELECT COUNT(*) AS total FROM applications"),
      db.get("SELECT COUNT(*) AS total FROM applications WHERE status = 'pending'"),
      db.get("SELECT COUNT(*) AS total FROM applications WHERE status = 'approved'"),
      db.get("SELECT COUNT(*) AS total FROM applications WHERE status = 'rejected'"),
      db.get("SELECT COUNT(*) AS total FROM applications WHERE status = 'permit_issued'"),
      db.get("SELECT COUNT(*) AS total FROM users WHERE role = 'owner'"),
    ]);

    res.json({
      totalApplications: totalApplications.total,
      pendingApplications: pendingApplications.total,
      approvedApplications: approvedApplications.total,
      rejectedApplications: rejectedApplications.total,
      permitIssuedApplications: permitIssuedApplications.total, // ✅ Added
      totalBusinessOwners: totalOwners.total,
    });
  } catch (err) {
    console.error("❌ Overview fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ------------------ Recent Activity ------------------ */
router.get("/recent-activity", async (req, res) => {
  try {
    const db = await dbPromise;
    const recentApplications = await db.all(`
      SELECT 
        a.id, 
        a.business_name, 
        a.status, 
        a.created_at, 
        u.name AS owner_name
      FROM applications a
      JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 10
    `);
    res.json(recentApplications);
  } catch (err) {
    console.error("❌ Recent activity fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ------------------ Analytics ------------------ */
router.get("/analytics", async (req, res) => {
  try {
    const db = await dbPromise;
    const monthlyData = await db.all(`
      SELECT 
        strftime('%Y-%m', created_at) AS month,
        COUNT(*) AS total
      FROM applications
      GROUP BY month
      ORDER BY month ASC
    `);

    // ✅ Include per-status counts for future use if needed (dashboard expansion)
    const perStatusData = await db.all(`
      SELECT 
        status,
        COUNT(*) AS count
      FROM applications
      GROUP BY status
    `);

    res.json({
      monthly: monthlyData,
      perStatus: perStatusData,
    });
  } catch (err) {
    console.error("❌ Analytics fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ------------------ Get All Business Owners ------------------ */
router.get("/business-owners", async (req, res) => {
  try {
    const db = await dbPromise;

    const owners = await db.all(`
      SELECT id, name AS owner_name, email, address
      FROM users
      WHERE role = 'owner'
      ORDER BY name ASC
    `);

    const ownersWithBusinesses = await Promise.all(
      owners.map(async (owner) => {
        const businesses = await db.all(
          `SELECT id AS application_id, business_name, location
           FROM applications
           WHERE user_id = ?
           ORDER BY business_name ASC`,
          [owner.id]
        );
        return { ...owner, businesses };
      })
    );

    res.json(ownersWithBusinesses);
  } catch (err) {
    console.error("❌ Fetch business owners error:", err);
    res.status(500).json({ error: "Failed to load business owners" });
  }
});

/* ------------------ All Applications ------------------ */
router.get("/all-applications", async (req, res) => {
  try {
    const db = await dbPromise;
    const { start, end } = req.query;

    let query = `
      SELECT 
        a.id,
        a.business_name,
        a.status,
        a.created_at,
        a.address,
        a.business_type,
        a.barangay_clearance,
        a.dti_certificate,
        a.lease_contract,
        a.fee,
        u.name AS owner_name
      FROM applications a
      JOIN users u ON a.user_id = u.id
    `;
    const params = [];

    if (start && end) {
      query += ` WHERE DATE(a.created_at) BETWEEN DATE(?) AND DATE(?) `;
      params.push(start, end);
    } else if (start) {
      query += ` WHERE DATE(a.created_at) >= DATE(?) `;
      params.push(start);
    } else if (end) {
      query += ` WHERE DATE(a.created_at) <= DATE(?) `;
      params.push(end);
    }

    query += " ORDER BY a.created_at DESC";
    const apps = await db.all(query, params);

    const formattedApps = apps.map((a) => ({
      ...a,
      files: [a.barangay_clearance, a.dti_certificate, a.lease_contract].filter(Boolean),
    }));

    res.json(formattedApps);
  } catch (err) {
    console.error("❌ Fetch all applications error:", err);
    res.status(500).json({ error: "Failed to load applications" });
  }
});

/* ------------------ Update Application Status (with fee & remarks) ------------------ */
router.put("/applications/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status, remarks, fee, staffId } = req.body;

  try {
    const db = await dbPromise;
    const io = req.app.get("io");

    // Update application status and fee
    await db.run(
      `UPDATE applications SET status = ?, fee = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, fee || 0, id]
    );

    // Log staff action
    if (staffId) {
      await db.run(
        `INSERT INTO staff_actions (staff_id, application_id, action, remarks)
         VALUES (?, ?, ?, ?)`,
        [staffId, id, status, remarks || null]
      );
    }

    // Get application owner
    const owner = await db.get(
      `SELECT u.id AS ownerId, u.name AS ownerName, a.business_name
       FROM applications a
       JOIN users u ON a.user_id = u.id
       WHERE a.id = ?`,
      [id]
    );

    // Emit notification
    if (io && owner) {
      io.to(`user_${owner.ownerId}`).emit("ownerNotification", {
        message: `Your application "${owner.business_name}" status has been updated to ${status}.`,
        applicationId: id,
        status,
        remarks,
        fee,
      });
    }

    res.json({ message: "Application status updated successfully." });
  } catch (err) {
    console.error("❌ Update application status error:", err.message);
    res.status(500).json({ error: "Failed to update application status" });
  }
});

/* ------------------ Get Staff Actions for Application ------------------ */
router.get("/applications/:id/actions", async (req, res) => {
  try {
    const db = await dbPromise;
    const actions = await db.all(
      `SELECT sa.*, u.name AS staff_name
       FROM staff_actions sa
       JOIN users u ON sa.staff_id = u.id
       WHERE sa.application_id = ?
       ORDER BY sa.created_at DESC`,
      [req.params.id]
    );
    res.json(actions);
  } catch (err) {
    console.error("❌ Fetch staff actions error:", err.message);
    res.status(500).json({ error: "Failed to fetch staff actions" });
  }
});

export default router;
