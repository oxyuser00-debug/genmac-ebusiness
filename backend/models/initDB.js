import sqlite3 from "sqlite3";
import { open } from "sqlite";
import bcrypt from "bcrypt";

(async () => {
  const db = await open({
    filename: "./database/genmac.db",
    driver: sqlite3.Database,
  });

  // ------------------ USERS ------------------
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('owner','staff','admin')) DEFAULT 'owner',
      profile_pic TEXT DEFAULT 'defaultProfile.png',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ------------------ BUSINESS APPLICATIONS ------------------
  await db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      business_name TEXT,
      business_type TEXT,
      address TEXT,
      barangay_clearance TEXT,
      dti_certificate TEXT,
      lease_contract TEXT,
      status TEXT DEFAULT 'pending', -- pending, approved, rejected, permit_issued
      fee REAL DEFAULT 0,
      payment_status TEXT DEFAULT 'not_paid', -- not_paid, completed
      permit_file TEXT, -- ✅ PDF permit file path or filename
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // ------------------ DOCUMENTS ------------------
  await db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER,
      file_name TEXT,
      file_path TEXT,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id)
    );
  `);

  // ------------------ STAFF ACTION LOG ------------------
  await db.exec(`
    CREATE TABLE IF NOT EXISTS staff_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id INTEGER,
      application_id INTEGER,
      action TEXT,
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (staff_id) REFERENCES users(id),
      FOREIGN KEY (application_id) REFERENCES applications(id)
    );
  `);

  // ------------------ PAYMENTS ------------------
  await db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'pending', -- pending, completed, failed
      payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      transaction_id TEXT,
      FOREIGN KEY (application_id) REFERENCES applications(id)
    );
  `);

  // ------------------ HASH PASSWORDS FOR DEFAULT USERS ------------------
  const adminPass = await bcrypt.hash("admin123", 10);
  const staffPass = await bcrypt.hash("staff123", 10);
  const ownerPass = await bcrypt.hash("owner123", 10);

  // ------------------ SEED SAMPLE USERS ------------------
  await db.run(
    `
    INSERT OR IGNORE INTO users (id, name, email, password, role, profile_pic)
    VALUES
      (1, 'Admin User', 'admin@genmac.local', ?, 'admin', 'defaultProfile.png'),
      (2, 'Staff User', 'staff@genmac.local', ?, 'staff', 'defaultProfile.png'),
      (3, 'Business Owner', 'owner@genmac.local', ?, 'owner', 'defaultProfile.png');
  `,
    [adminPass, staffPass, ownerPass]
  );

  console.log("✅ Database initialized with users, applications (with permit_file), documents, staff actions, and payments tables.");
  await db.close();
})();
