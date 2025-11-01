import { io } from "socket.io-client";

// Get logged-in user info from localStorage
const user = JSON.parse(localStorage.getItem("user"));
const token = localStorage.getItem("token");

export const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000", {
  query: {
    userId: user?.id,
    role: user?.role,
  },
  auth: {
    token,
  },
});

socket.on("connect", () => console.log("✅ Connected to Socket.IO:", socket.id));
socket.on("disconnect", () => console.log("🔴 Disconnected from Socket.IO"));
