import express from "express";
import { dbPromise } from "../server.js";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

let io; // Socket.IO instance

// ✅ Function to set Socket.IO instance from server.js
export const setSocketIO = (socketIO) => {
  io = socketIO;
};

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ✅ Middleware to verify JWT
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

// ✅ Helper function to generate an official Business Permit PDF
const generatePermitPDF = async (application, transactionId = "N/A") => {
  const dir = path.resolve("uploads/permits");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const fileName = `permit_${application.id}.pdf`;
  const filePath = path.join(dir, fileName);

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 100, left: 100, right: 100, bottom: 100 },
  });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  const bgPath = path.resolve("uploads/permit-bg.png");
  const logoPath = path.resolve("uploads/logo.jpg");

  // Background image
  if (fs.existsSync(bgPath)) {
    doc.image(bgPath, 0, 0, { width: doc.page.width, height: doc.page.height });
  }

  // Logo
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 100, 100, { width: 80 });
  }

  // Header texts
  doc.fontSize(14).fillColor("#000").text("Republic of the Philippines", { align: "center" });
  doc.text("Province of Eastern Samar", { align: "center" });
  doc.text("Municipality of General MacArthur", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(16).text("OFFICE OF THE MAYOR", { align: "center" });
  doc.moveDown(1);
  doc.fontSize(22).fillColor("#002060").text("BUSINESS PERMIT 2025", { align: "center" });
  doc.moveDown(2);

  // Permit Information
  doc.fillColor("black").fontSize(12);
  doc.text("TO WHOM IT MAY CONCERN:", { align: "left" });
  doc.moveDown(1);

  doc.text("This permit is granted to:", { align: "left" });
  doc.font("Helvetica-Bold").text(application.owner_name || "N/A", { align: "center" });
  doc.moveDown(0.5);

  doc.font("Helvetica").text(`Business Name: ${application.business_name}`, { align: "center" });
  doc.text(`Business Type: ${application.business_type}`, { align: "center" });
  doc.text(`Address: ${application.address}`, { align: "center" });
  doc.moveDown(2);

  doc.text(
    "This certifies that the above-mentioned business is duly permitted to operate within the jurisdiction of the Municipality of General MacArthur, Eastern Samar, subject to all existing municipal ordinances.",
    { align: "justify" }
  );
  doc.moveDown(2);

  // ✅ Format issue and expiry dates (valid for 1 year)
  const dateOptions = { year: "numeric", month: "long", day: "numeric" };
  const issueDate = new Date();
  const expiryDate = new Date(issueDate);
  expiryDate.setFullYear(issueDate.getFullYear() + 1);

  const formattedIssue = issueDate.toLocaleDateString("en-PH", dateOptions);
  const formattedExpiry = expiryDate.toLocaleDateString("en-PH", dateOptions);

  doc.text(`Issued on: ${formattedIssue}`, { align: "left" });
  doc.text(`Valid until: ${formattedExpiry}`, { align: "left" });
  doc.moveDown(3);

  // Note (no signature)
  doc.text(
    "Note: This business permit is digitally issued and does not require a physical signature.",
    { align: "center", italics: true }
  );

  doc.end();
  await new Promise((resolve) => stream.on("finish", resolve));

  return `/uploads/permits/${fileName}`;
};

/* ---------------- Record Payment (manual or after Stripe) ---------------- */
router.post("/", verifyToken, async (req, res) => {
  const { applicationId, amount, transactionId } = req.body;

  try {
    const db = await dbPromise;

    // Check application exists and is approved
    const appData = await db.get(
      `SELECT a.*, u.name AS owner_name FROM applications a
       JOIN users u ON a.user_id = u.id
       WHERE a.id = ?`,
      [applicationId]
    );

    if (!appData) return res.status(404).json({ message: "Application not found" });
    if (appData.status !== "approved") return res.status(400).json({ message: "Application not approved yet" });

    // Insert payment record
    await db.run(
      `INSERT INTO payments (application_id, amount, status, payment_date, transaction_id)
       VALUES (?, ?, 'completed', CURRENT_TIMESTAMP, ?)`,
      [applicationId, amount, transactionId]
    );

    // ✅ Generate the PDF permit
    const permitPath = await generatePermitPDF(appData, transactionId);

    // ✅ Update application status and attach permit file
    await db.run(
      `UPDATE applications
       SET status = 'permit_issued',
           updated_at = CURRENT_TIMESTAMP,
           payment_status = 'completed',
           permit_file = ?
       WHERE id = ?`,
      [permitPath, applicationId]
    );

    // ✅ Notify owner via Socket.IO
    if (io) {
      io.to(`user_${appData.user_id}`).emit("ownerNotification", {
        message: `Your payment for "${appData.business_name}" was received. Your business permit has been issued.`,
        applicationId,
        status: "permit_issued",
      });
      console.log(`✅ Permit PDF generated and owner notified for app ${applicationId}`);
    }

    res.json({
      success: true,
      message: "Payment recorded, permit issued, and file attached.",
      permit_file: permitPath,
    });
  } catch (err) {
    console.error("❌ Payment recording error:", err.message);
    res.status(500).json({ error: "Failed to record payment." });
  }
});

/* ---------------- Fetch Payment Status ---------------- */
router.get("/:applicationId", verifyToken, async (req, res) => {
  try {
    const db = await dbPromise;
    const { applicationId } = req.params;
    const payment = await db.get("SELECT * FROM payments WHERE application_id = ?", [applicationId]);
    res.json(payment || { status: "not_paid" });
  } catch (err) {
    console.error("❌ Fetch payment error:", err.message);
    res.status(500).json({ error: "Failed to fetch payment." });
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

/* ---------------- Create Stripe Payment Intent ---------------- */
router.post("/create-payment-intent", verifyToken, async (req, res) => {
  try {
    const { applicationId, amount } = req.body;
    const db = await dbPromise;

    // Ensure application exists and approved
    const appData = await db.get("SELECT * FROM applications WHERE id = ?", [applicationId]);
    if (!appData) return res.status(404).json({ message: "Application not found" });
    if (appData.status !== "approved") return res.status(400).json({ message: "Application not approved yet" });

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "php",
      payment_method_types: ["card"],
      metadata: { applicationId: applicationId.toString() },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("❌ Stripe PaymentIntent error:", err.message);
    res.status(500).json({ error: "Failed to create payment intent" });
  }
});

export default router;
