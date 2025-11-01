import express from "express";
import jwt from "jsonwebtoken";
import { dbPromise } from "../server.js";

const router = express.Router();

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ error: "No authorization token" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ error: "Invalid token" });
  }
};

router.get("/", verifyToken, async (req, res) => {
  const db = await dbPromise;
  const userId = req.user.id;

  // ✅ Include all 4 statuses in counts
  const total = await db.get(
    "SELECT COUNT(*) AS count FROM applications WHERE user_id = ?",
    [userId]
  );
  const approved = await db.get(
    "SELECT COUNT(*) AS count FROM applications WHERE user_id = ? AND status = 'approved'",
    [userId]
  );
  const pending = await db.get(
    "SELECT COUNT(*) AS count FROM applications WHERE user_id = ? AND status = 'pending'",
    [userId]
  );
  const rejected = await db.get(
    "SELECT COUNT(*) AS count FROM applications WHERE user_id = ? AND status = 'rejected'",
    [userId]
  );
  const permitIssued = await db.get(
    "SELECT COUNT(*) AS count FROM applications WHERE user_id = ? AND status = 'permit_issued'",
    [userId]
  );

  // ✅ Applications per month (chart) - with permit_issued included
  const chart = await db.all(
    `
    SELECT 
        strftime('%m', created_at) AS month,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
        SUM(CASE WHEN status = 'permit_issued' THEN 1 ELSE 0 END) AS permit_issued
    FROM applications
    WHERE user_id = ?
    GROUP BY strftime('%m', created_at)
    ORDER BY month
   `,
    [userId]
  );

  // ✅ Recent applications
  const recent = await db.all(
    `
    SELECT id, business_name, status, created_at 
    FROM applications 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT 5
    `,
    [userId]
  );

  // ✅ Include permit_issued in stats
  res.json({
    stats: {
      total: total.count,
      approved: approved.count,
      pending: pending.count,
      rejected: rejected.count,
      permit_issued: permitIssued.count,
    },
    chart,
    recent,
  });
});

export default router;
