import db from "./models/initDB.js";

db.serialize(() => {
  db.run("ALTER TABLE applications ADD COLUMN barangay_clearance TEXT");
  db.run("ALTER TABLE applications ADD COLUMN dti_certificate TEXT");
  db.run("ALTER TABLE applications ADD COLUMN lease_contract TEXT");
  console.log("✅ Columns added successfully!");
});

db.close();
