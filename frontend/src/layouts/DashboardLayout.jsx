import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { LogOut, FileText, User, Home } from "lucide-react";
import Swal from "sweetalert2";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { socket } from "../utils/socket";
import { showStatusToast } from "../utils/toastConfig";

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [applications, setApplications] = useState([]);
  const [dashboardData, setDashboardData] = useState({}); // optional: summary counts

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";


  // ✅ Fetch applications
  const fetchApplications = async () => {
    try {
      const res = await fetch(`${API_URL}/api/applications/user`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (!res.ok) {
        console.error("❌ API returned error:", res.status);
        return; // stop further processing
      }

      const data = await res.json();
      setApplications(data);
    } catch (err) {
      console.error("❌ Failed to fetch applications:", err);
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${API_URL}/api/applications/user`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (!res.ok) {
        console.error("❌ API returned error:", res.status);
        return;
      }

      const data = await res.json();

      if (!Array.isArray(data)) {
        console.error("❌ API did not return an array:", data);
        return;
      }

      setDashboardData({
        total: data.length,
        pending: data.filter((a) => a.status === "pending").length,
        approved: data.filter((a) => a.status === "approved").length,
        rejected: data.filter((a) => a.status === "rejected").length,
      });
    } catch (err) {
      console.error("❌ Failed to fetch dashboard data:", err);
    }
  };


  // ✅ Socket listener for real-time updates
  useEffect(() => {
    // Listen to owner notifications
    socket.on("ownerNotification", (data) => {
      showStatusToast(data.message, data.status);

      // Auto-refresh applications and dashboard
      fetchApplications();
      fetchDashboard();
    });

    return () => socket.off("ownerNotification");
  }, []);

  // ✅ Initial fetch on mount
  useEffect(() => {
    fetchApplications();
    fetchDashboard();
  }, []);

  const handleLogout = () => {
    Swal.fire({
      title: "Logout?",
      text: "Are you sure you want to logout?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, logout",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#2563eb",
    }).then((res) => {
      if (res.isConfirmed) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      }
    });
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/login");
  }, [navigate]);

  const navLinks = [
    { to: "/dashboard", label: "Dashboard", icon: <Home size={18} /> },
    { to: "/applications", label: "My Applications", icon: <FileText size={18} /> },
    { to: "/profile", label: "Profile", icon: <User size={18} /> },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg p-5 flex flex-col justify-between">
        <div>
          <h2 className="text-2xl font-bold text-blue-700 mb-8">BUSINESS OWNER DASHBOARD</h2>
          <nav className="space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                  location.pathname === link.to
                    ? "bg-blue-100 text-blue-700 font-semibold"
                    : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
                }`}
              >
                {link.icon} {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-red-500 hover:text-red-700"
        >
          <LogOut size={18} /> Logout
        </button>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navbar */}
        <header className="bg-white shadow px-6 py-4 flex justify-end items-center">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-full bg-blue-200 flex items-center justify-center font-semibold text-blue-800">
              U
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet context={{ applications, dashboardData, fetchApplications, fetchDashboard }} />
        </main>
        <ToastContainer />
      </div>
    </div>
  );
}
