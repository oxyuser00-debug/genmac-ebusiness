import sqlite3 from "sqlite3";
import { open } from "sqlite";

// ✅ Shared database connection for the entire app
const dbPromise = open({
  filename: "./database/genmac.db",
  driver: sqlite3.Database,
});

export default dbPromise;
