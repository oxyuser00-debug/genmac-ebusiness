// src/pages/admin/StaffManagement.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DataTable from "react-data-table-component";
import Swal from "sweetalert2";
import { Plus, X } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function StaffManagement() {
  const [staffs, setStaffs] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "staff", password: "" });

  const token = localStorage.getItem("token");
  const navigate = useNavigate(); // ✅ Added navigation

  const fetchStaffs = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/api/staff`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStaffs(data.data || []);
    } catch (err) {
      console.error("Fetch error:", err);
      Swal.fire("Error", "Failed to load staff", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffs();
  }, []);

  const filteredStaffs = (staffs || []).filter((s) => {
    const matchRole = filter === "all" || s.role === filter;
    const term = search.toLowerCase();
    const matchSearch =
      s.name.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term) ||
      s.role.toLowerCase().includes(term);
    return matchRole && matchSearch;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/api/staff`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Swal.fire("Success", "Staff created successfully", "success");
      setShowModal(false);
      setForm({ name: "", email: "", role: "staff", password: "" });
      fetchStaffs();
    } catch (err) {
      console.error(err);
      Swal.fire("Error", err.response?.data?.error || "Failed to create staff", "error");
    }
  };

  const columns = [
    { name: "Name", selector: (r) => r.name, sortable: true },
    { name: "Email", selector: (r) => r.email },
    {
      name: "Role",
      cell: (r) => {
        const base = "px-3 py-1 rounded-full text-white text-sm font-medium";
        let color = "";
        if (r.role === "admin") color = "bg-green-600";
        else if (r.role === "staff") color = "bg-yellow-500";
        else if (r.role === "owner") color = "bg-blue-600";
        return <span className={`${base} ${color}`}>{r.role.toUpperCase()}</span>;
      },
      sortable: true,
    },
  ];

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Staff Management</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus size={18} /> Add Staff
        </button>
      </div>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="Search..."
          className="border rounded px-3 py-2 w-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="border rounded px-3 py-2"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
          <option value="owner">Owner</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filteredStaffs}
        progressPending={loading}
        pagination
        highlightOnHover
        pointerOnHover
        onRowClicked={(row) => navigate(`/admin/users/${row.StaffID}`)} // ✅ Added click navigation
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-semibold mb-4">Add New Staff</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                required
                type="text"
                placeholder="Full name"
                className="border rounded w-full px-3 py-2"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                required
                type="email"
                placeholder="Email"
                className="border rounded w-full px-3 py-2"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <select
                className="border rounded w-full px-3 py-2"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
              <input
                required
                type="password"
                placeholder="Password"
                className="border rounded w-full px-3 py-2"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
