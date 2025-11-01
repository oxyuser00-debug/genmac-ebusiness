import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import http from "http";
import { Server } from "socket.io";
import authRoutes from "./routes/auth.js";
import appRoutes, { setSocketIO } from "./routes/applications.js"; // 👈 import setSocketIO
import analyticsRoutes from "./routes/analytics.js";
import usersRoutes from "./routes/users.js";
import adminRoutes from "./routes/admin.js";
import staffRoutes from "./routes/staff.js";
import paymentsRouter, { setSocketIO as setPaymentsSocket } from "./routes/payments.js";


dotenv.config();

// open SQLite database
export const dbPromise = open({
  filename: "./database/genmac.db",
  driver: sqlite3.Database,
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }, // adjust if needed
});

// ✅ Pass io instance to applications.js
setSocketIO(io);
setPaymentsSocket(io);

// also expose io for other routes (like admin.js)
app.set("io", io);

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// routes
app.use("/api/auth", authRoutes);
app.use("/api/applications", appRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/payments", paymentsRouter);

// root route
app.get("/", (req, res) => {
  res.send("✅ GenMac eBusiness API with Socket.IO is running");
});

io.on("connection", (socket) => {
  console.log("🟢 New client connected:", socket.id);

  // Expect user info from client query
  const { userId, role } = socket.handshake.query;

  if (role === "owner" && userId) {
    socket.join(`user_${userId}`);
    console.log(`Owner ${userId} joined room user_${userId}`);
  }

  socket.on("disconnect", () => console.log("🔴 Client disconnected:", socket.id));
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
