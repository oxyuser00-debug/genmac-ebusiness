import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { LogOut, FileText, Home, BarChart2, Users, Wallet } from "lucide-react";
import Swal from "sweetalert2";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { socket } from "../utils/socket";
import { showStatusToast } from "../utils/toastConfig";

export default function AdminDashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.role || "staff";

  // ✅ Toastify socket listeners with clickable toast
  useEffect(() => {
    // Admin: new application notification (green)
    socket.on("adminNotification", (data) => {
      showStatusToast(data.message, "new", () =>
        navigate(`/admin/applications/${data.applicationId}`)
      );
    });

    // Owner notifications (color-coded by status)
    socket.on("ownerNotification", (data) => {
      showStatusToast(data.message, data.status);
    });

    return () => {
      socket.off("adminNotification");
      socket.off("ownerNotification");
    };
  }, [navigate]);

  // ✅ Auth guard
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/login");
  }, [navigate]);

  const handleLogout = () => {
    Swal.fire({
      title: "Are you sure?",
      text: "You’ll be logged out of your session.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, logout",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#2563eb",
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        navigate("/login");
      }
    });
  };

  const navLinks = [
    { to: "/admin", label: "Dashboard", icon: <Home size={18} /> },
    { to: "/admin/applications", label: "Applications", icon: <FileText size={18} /> },
    { to: "/admin/payments", label: "Payments", icon: <Wallet size={18} /> },
    ...(role === "admin"
      ? [
          { to: "/admin/reports", label: "Reports", icon: <BarChart2 size={18} /> },
          { to: "/admin/staff", label: "Staff Management", icon: <Users size={18} /> },
        ]
      : []),
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg p-5 flex flex-col justify-between">
        <div>
          <h2 className="text-2xl font-bold text-blue-700 mb-8">
            {role === "admin" ? "ePermit Admin" : "ePermit Staff"}
          </h2>
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
            <div className="text-gray-700 font-medium">
              {user?.name} ({role})
            </div>
            <div className="w-9 h-9 rounded-full bg-blue-200 flex items-center justify-center font-semibold text-blue-800">
              {user?.name?.[0] || "A"}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>

        {/* Toast Container for notifications */}
        <ToastContainer />
      </div>
    </div>
  );
}
