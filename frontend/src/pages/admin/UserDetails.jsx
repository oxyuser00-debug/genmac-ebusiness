import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { ArrowLeft, Edit3, Save, X } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function UserDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loggedRole, setLoggedRole] = useState("");

  const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const decodeToken = () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return "";
      const [, payload] = token.split(".");
      return JSON.parse(atob(payload)).role;
    } catch {
      return "";
    }
  };

  const fetchUser = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/staff`, {
        headers: authHeader(),
      });

      const found = data.data.find(
        (u) => Number(u.StaffID) === Number(id) || Number(u.id) === Number(id)
      );

      if (!found) return Swal.fire("Not Found", "User not found.", "warning");
      setUser({
        id: found.StaffID || found.id,
        name: found.name,
        email: found.email,
        role: found.role,
        profile_pic: found.profile_pic || "defaultProfile.png",
      });
    } catch (err) {
      console.error("Error fetching user:", err);
      Swal.fire("Error", "Failed to load user details", "error");
    }
  };

  const handleSave = async () => {
    try {
      if (loggedRole !== "admin") {
        return Swal.fire("Forbidden", "Only admins can update users.", "warning");
      }

      const confirm = await Swal.fire({
        title: "Confirm Update",
        text: `Are you sure you want to save changes to "${user.name}"?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#2563eb",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Yes, save it!",
      });

      if (!confirm.isConfirmed) return;

      await axios.put(
        `${API_BASE}/api/staff/${user.id}`,
        {
          name: user.name,
          email: user.email,
          role: user.role,
        },
        { headers: authHeader() }
      );

      Swal.fire("Updated!", "User information updated successfully.", "success");
      setIsEditing(false);
      fetchUser();
    } catch (err) {
      console.error("Error updating user:", err);
      Swal.fire("Error", err?.response?.data?.error || "Update failed", "error");
    }
  };

  useEffect(() => {
    setLoggedRole(decodeToken());
    fetchUser();
  }, [id]);

  if (!user)
    return (
      <div className="p-4">
        <p>Loading user details...</p>
      </div>
    );

  const canEdit = loggedRole === "admin"; // ✅ Admins can edit all users

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 mb-6 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
      >
        <ArrowLeft size={18} /> Back
      </button>

      <div className="bg-white shadow-md rounded-xl p-6 border border-gray-200 flex flex-col md:flex-row gap-6">
        {/* Left: Profile picture */}
        <div className="flex-shrink-0 w-full md:w-1/3 flex justify-center items-center">
          <img
            src={`${API_BASE}/uploads/profiles/${user.profile_pic}`}
            alt="profile"
            className="w-40 h-40 rounded-full object-cover border"
          />
        </div>

        {/* Right: Info */}
        <div className="flex-1 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">Name</label>
            {isEditing ? (
              <input
                className="border p-2 rounded-lg w-full"
                value={user.name}
                onChange={(e) => setUser({ ...user, name: e.target.value })}
              />
            ) : (
              <p className="text-gray-800">{user.name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">Email</label>
            {isEditing ? (
              <input
                className="border p-2 rounded-lg w-full"
                value={user.email}
                onChange={(e) => setUser({ ...user, email: e.target.value })}
              />
            ) : (
              <p className="text-gray-800">{user.email}</p>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">Role</label>
            {isEditing ? (
              <select
                className="border p-2 rounded-lg w-full"
                value={user.role}
                onChange={(e) => setUser({ ...user, role: e.target.value })}
              >
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
                <option value="owner">Owner</option>
              </select>
            ) : (
              <span
                className={`px-3 py-1 rounded-full text-white text-sm font-medium ${
                  user.role === "admin"
                    ? "bg-green-600"
                    : user.role === "staff"
                    ? "bg-yellow-500"
                    : "bg-blue-600"
                }`}
              >
                {user.role.toUpperCase()}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          {canEdit && (
            <div className="flex justify-end gap-2 mt-4">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  <Edit3 size={18} /> Edit
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                  >
                    <Save size={18} /> Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      fetchUser();
                    }}
                    className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition"
                  >
                    <X size={18} /> Cancel
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
