import { useEffect, useState } from "react";
import axios from "axios";
import DataTable from "react-data-table-component";
import Swal from "sweetalert2";
import { Eye, Trash2, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { socket } from "../../utils/socket";
import { showStatusToast } from "../../utils/toastConfig";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const navigate = useNavigate();

  useEffect(() => {
    fetchPayments();

    socket.on("new-payment", (data) => {
      showStatusToast(`New payment received: ${data.business_name}`);
      setPayments((prev) => [data, ...prev]);
    });

    return () => {
      socket.off("new-payment");
    };
  }, []);

  useEffect(() => {
    let filtered = payments;

    // 🔍 Search filter
    if (search) {
      filtered = filtered.filter(
        (p) =>
          p.business_name?.toLowerCase().includes(search.toLowerCase()) ||
          p.owner_name?.toLowerCase().includes(search.toLowerCase()) ||
          p.transaction_id?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // 📅 Date range filter
    if (dateRange.from && dateRange.to) {
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      filtered = filtered.filter((p) => {
        const date = new Date(p.payment_date);
        return date >= fromDate && date <= toDate;
      });
    }

    setFilteredPayments(filtered);
  }, [search, dateRange, payments]);

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/api/payments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPayments(res.data);
      setFilteredPayments(res.data);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to load payments", "error");
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This will permanently delete the payment record.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`${API_BASE}/api/payments/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        Swal.fire("Deleted!", "Payment record deleted successfully.", "success");
        fetchPayments();
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Failed to delete payment.", "error");
      }
    }
  };

  const columns = [
    {
      name: "Transaction ID",
      selector: (row) => row.transaction_id || "—",
      sortable: true,
      wrap: true,
    },
    {
      name: "Business Name",
      selector: (row) => row.business_name || "—",
      sortable: true,
      wrap: true,
    },
    {
      name: "Owner",
      selector: (row) => row.owner_name || "—",
      sortable: true,
      wrap: true,
    },
    {
      name: "Amount",
      selector: (row) => `₱${row.amount?.toFixed(2) || "0.00"}`,
      sortable: true,
      wrap: true,
    },
    {
      name: "Date Paid",
      selector: (row) =>
        row.payment_date
          ? new Date(row.payment_date).toLocaleDateString()
          : "—",
      sortable: true,
    },
    {
      name: "Status",
      cell: (row) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${
            row.status === "completed"
              ? "bg-green-100 text-green-800"
              : row.status === "pending"
              ? "bg-yellow-100 text-yellow-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {row.status || "N/A"}
        </span>
      ),
      sortable: true,
    },
    {
      name: "Actions",
      cell: (row) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              Swal.fire({
                title: "Payment Details",
                html: `
                  <div style="text-align:left">
                    <p><b>Transaction ID:</b> ${row.transaction_id}</p>
                    <p><b>Business:</b> ${row.business_name}</p>
                    <p><b>Owner:</b> ${row.owner_name}</p>
                    <p><b>Amount:</b> ₱${row.amount?.toFixed(2)}</p>
                    <p><b>Status:</b> ${row.status}</p>
                    <p><b>Date:</b> ${new Date(
                      row.payment_date
                    ).toLocaleString()}</p>
                  </div>
                `,
                icon: "info",
                confirmButtonText: "Close",
              });
            }}
            className="bg-blue-500 text-white flex justify-center p-2 rounded text-xs hover:bg-blue-600"
          >
            <Eye className="w-3 h-3 inline" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row.id);
            }}
            className="bg-red-500 text-white flex justify-center p-2 rounded text-xs hover:bg-red-600"
          >
            <Trash2 className="w-3 h-3 inline" />
          </button>
        </div>
      ),
    },
  ];

  const customStyles = {
    rows: {
      style: {
        cursor: "pointer",
        "&:hover": { backgroundColor: "#f9fafb" },
      },
    },
    headCells: {
      style: {
        backgroundColor: "#f3f4f6",
        color: "#374151",
        fontWeight: "600",
      },
    },
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">
        Payment Transactions
      </h1>

      {/* ✅ Search + Date Filter */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input
          type="text"
          placeholder="Search by business, owner, or transaction ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm w-64 focus:ring-2 focus:ring-blue-400"
        />

        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-gray-600" />
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, from: e.target.value }))
            }
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400"
          />
          <span className="text-gray-500 text-sm">to</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, to: e.target.value }))
            }
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      {/* ✅ Data Table */}
      <DataTable
        columns={columns}
        data={filteredPayments}
        pagination
        highlightOnHover
        customStyles={customStyles}
      />
    </div>
  );
}
