import { useEffect, useState } from "react";
import axios from "axios";
import DataTable from "react-data-table-component";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Clock, XCircle, Trash2, Edit, CreditCard } from "lucide-react";
import io from "socket.io-client";

const socket = io("http://localhost:5000"); // Connect to backend Socket.IO

const Applications = () => {
  const [applications, setApplications] = useState([]);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchApplications();

    // Listen to real-time notifications from backend (e.g., status or payment updates)
    socket.on("ownerNotification", (data) => {
      Swal.fire("Notification", data.message, "info");
      fetchApplications(); // Refresh table dynamically
    });

    return () => socket.off("ownerNotification");
  }, []);

  const fetchApplications = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/applications", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const appsWithPayment = await Promise.all(
        res.data.map(async (app) => {
          if (app.status === "approved") {
            try {
              // Get latest payment status
              const payRes = await axios.get(`http://localhost:5000/api/payments/${app.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              return { ...app, paymentStatus: payRes.data.status || "not_paid" };
            } catch {
              return { ...app, paymentStatus: "not_paid" };
            }
          } else {
            return { ...app, paymentStatus: null };
          }
        })
      );

      setApplications(appsWithPayment);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to load applications.", "error");
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This action will permanently delete the application.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await axios.delete(`http://localhost:5000/api/applications/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        Swal.fire("Deleted!", "Application has been deleted.", "success");
        fetchApplications();
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Failed to delete application.", "error");
      }
    }
  };

  const columns = [
    { name: "Business Name", selector: (row) => row.business_name, sortable: true },
    { name: "Type", selector: (row) => row.business_type, sortable: true },
    { name: "Address", selector: (row) => row.address, sortable: true, grow: 2 },
    {
      name: "Status",
      cell: (row) => {
        let bgColor = "bg-gray-100 text-gray-700";
        let displayText = row.status
          .replace(/_/g, " ") // replace underscores
          .replace(/\b\w/g, (l) => l.toUpperCase()); // capitalize each word

        if (row.status === "approved") {
          bgColor = "bg-green-100 text-green-700";
        } else if (row.status === "pending") {
          bgColor = "bg-yellow-100 text-yellow-700";
        } else if (row.status === "rejected") {
          bgColor = "bg-red-100 text-red-700";
        }
        else if (row.status === "permit_issued") {
          bgColor = "bg-blue-100 text-blue-700";
        }

        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${bgColor}`}>
            {displayText}
          </span>
        );
      },
      sortable: true,
    },
    {
      name: "Amount to Pay",
      selector: (row) =>
        row.status !== "rejected"
          ? `₱${row.fee?.toFixed(2) || "0.00"}`
          : "—",
      sortable: true,
      right: true,
    },
    {
      name: "Remarks",
      selector: (row) => (row.status === "rejected" ? row.remarks || "No remarks" : "—"),
      sortable: true,
      wrap: true,
    },
    {
      name: "Payment Status",
      cell: (row) => {
        if (row.status === "rejected") {
          return <span className="text-red-700">Rejected</span>;
        }
        if (row.status === "permit_issued" || row.paymentStatus === "completed") {
          return <span className="text-green-700 font-medium">Paid</span>;
        }
        if (row.status === "approved") {
          return <span className="text-yellow-700">Pending Payment</span>;
        }
        return <span className="text-gray-500">N/A</span>;
      },
      sortable: true,
    },
    { name: "Date Submitted", selector: (row) => new Date(row.created_at).toLocaleDateString(), sortable: true },
    {
      name: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-3">
          {/* View details */}
          <button
            onClick={() => navigate(`/application/${row.id}`)}
            className="text-blue-600 cursor-pointer hover:text-blue-800"
            title="View Details"
          >
            <CheckCircle size={18} />
          </button>

          {/* Edit only rejected */}
          {row.status === "rejected" && (
            <button
              onClick={() => navigate(`/application/edit/${row.id}`)}
              className="text-yellow-600 cursor-pointer hover:text-yellow-800"
              title="Edit Application"
            >
              <Edit size={18} />
            </button>
          )}

          {/* Delete */}
          <button
            onClick={() => handleDelete(row.id)}
            className="text-red-600 cursor-pointer hover:text-red-800"
            title="Delete"
          >
            <Trash2 size={18} />
          </button>

          {/* Pay Now — redirect to payment page */}
          {row.status === "approved" && row.paymentStatus !== "completed" && (
            <button
              onClick={() => navigate(`/payment/${row.id}`)}
              className="text-green-600 cursor-pointer hover:text-green-800 flex items-center gap-1"
              title="Pay Now"
            >
              <CreditCard size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  const customStyles = {
    rows: { style: { cursor: "pointer", "&:hover": { backgroundColor: "#f9fafb" } } },
    headCells: { style: { backgroundColor: "#f3f4f6", color: "#374151", fontWeight: "600" } },
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Applications</h1>
        <button
          onClick={() => navigate("/apply")}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + New Application
        </button>
      </div>

      <div className="bg-white shadow-md rounded-xl p-5 border border-gray-200">
        <DataTable
          columns={columns}
          data={applications}
          pagination
          highlightOnHover
          customStyles={customStyles}
          onRowClicked={(row) => navigate(`/application/${row.id}`)}
        />
      </div>
    </div>
  );
};

export default Applications;
