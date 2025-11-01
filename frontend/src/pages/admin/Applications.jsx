import { useEffect, useState } from "react";
import axios from "axios";
import DataTable from "react-data-table-component";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { socket } from "../../utils/socket";
import { showStatusToast } from "../../utils/toastConfig";
import { File, Eye, Trash2 } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [filter, setFilter] = useState("");
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    fetchApplications();

    socket.on("new-application", (data) => {
      showStatusToast(`New application submitted: ${data.business_name}`, () =>
        navigate(`/admin/applications/${data.id}`)
      );

      setApplications((prev) => {
        if (!filter || data.status.toLowerCase() === filter.toLowerCase()) {
          return [data, ...prev];
        }
        return prev;
      });
    });

    return () => {
      socket.off("new-application");
    };
  }, [filter]);

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/api/admin/all-applications`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let apps = res.data;
      if (filter) {
        apps = apps.filter(
          (app) => app.status?.toLowerCase() === filter.toLowerCase()
        );
      }
      setApplications(apps);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to load applications", "error");
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      let payload = { staffId: user.id };

      if (status === "approved") {
        const { value: fee } = await Swal.fire({
          title: "Enter Amount to Pay",
          input: "number",
          inputLabel: "Amount (Fee) for this application:",
          inputPlaceholder: "100.00",
          inputAttributes: { min: 0 },
          showCancelButton: true,
          confirmButtonText: "Submit",
          cancelButtonText: "Cancel",
        });
        if (!fee && fee !== 0) return;
        payload.fee = parseFloat(fee);
        payload.status = "approved";
      }

      if (status === "rejected") {
        const { value: remarks } = await Swal.fire({
          title: "Reason for Rejection",
          input: "textarea",
          inputLabel: "Please provide a reason for rejecting this application:",
          inputPlaceholder: "Type your remarks here...",
          showCancelButton: true,
          confirmButtonText: "Submit",
          cancelButtonText: "Cancel",
        });
        if (!remarks) return;
        payload.remarks = remarks;
        payload.status = "rejected";
      }

      const token = localStorage.getItem("token");
      await axios.put(
        `${API_BASE}/api/admin/applications/${id}/status`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Swal.fire(
        "Success",
        `Application ${
          status === "approved" ? "approved" : "rejected"
        } successfully.`,
        "success"
      );

      fetchApplications(); // ✅ Refresh after update
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to update status", "error");
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This will permanently delete the application.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`${API_BASE}/api/applications/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        Swal.fire("Deleted!", "Application deleted successfully.", "success");
        fetchApplications();
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Failed to delete application.", "error");
      }
    }
  };

  const buildFileUrl = (file) => {
    if (!file) return null;
    if (file.startsWith("http://") || file.startsWith("https://")) return file;
    const clean = file.replace(/^\/+/, "");
    const path = clean.startsWith("uploads/") ? clean : `uploads/${clean}`;
    return `${API_BASE}/${path}`;
  };

  const columns = [
    {
      name: "Business Name",
      selector: (row) => row.business_name,
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
      name: "Type",
      selector: (row) => row.business_type || "—",
      sortable: true,
      wrap: true,
    },
    {
      name: "Address",
      selector: (row) => row.address || "—",
      sortable: true,
      wrap: true,
    },
    {
      name: "Files",
      cell: (row) => {
        const files = ["barangay_clearance", "dti_certificate", "lease_contract"]
          .map((key) => {
            const fileUrl = buildFileUrl(row[key]);
            if (!fileUrl) return null;
            return (
              <a
                key={key}
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
                title={key.replace("_", " ")}
              >
                <File className="w-4 h-4" />
              </a>
            );
          })
          .filter(Boolean);

        if (files.length === 0) {
          return <span className="text-gray-400 text-sm">No files attached</span>;
        }

        return <div className="flex flex-wrap gap-2">{files}</div>;
      },
    },
    {
      name: "Status",
      selector: (row) => row.status,
      cell: (row) => {
        let bg = "bg-gray-100 text-gray-800";
        let label = row.status;

        switch (row.status) {
          case "pending":
            bg = "bg-yellow-100 text-yellow-800";
            label = "Pending";
            break;
          case "approved":
            bg = "bg-green-100 text-green-800";
            label = "Approved";
            break;
          case "permit_issued":
            bg = "bg-blue-100 text-blue-800";
            label = "Permit Issued";
            break;
          case "rejected":
            bg = "bg-red-100 text-red-800";
            label = "Rejected";
            break;
          default:
            label = row.status?.replace("_", " ");
        }

        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${bg}`}
          >
            {label}
          </span>
        );
      },
      sortable: true,
    },
    {
      name: "Amount / Remarks",
      cell: (row) => (
        <span className="text-sm text-gray-700">
          {row.status !== "rejected"
            ? `₱${row.fee?.toFixed(2) || "0.00"}`
            : row.remarks || "—"}
        </span>
      ),
      sortable: false,
    },
    {
      name: "Actions",
      cell: (row) => (
        <div className="flex flex-col gap-2 my-2">
          {/* ✅ Always show View button */}
          <div className="flex gap-2 my-2" >
            <button
                onClick={(e) => {
                e.stopPropagation();
                navigate(`/admin/applications/${row.id}`);
                }}
                className="bg-blue-500 text-white flex justify-center p-2 rounded text-xs hover:bg-blue-600"
            >
                <Eye className="w-3 h-3 inline" />
            </button>

            {/* ✅ Always show Delete button */}
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

          {/* ✅ Approve/Reject still shown when pending */}
          {row.status === "pending" && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusUpdate(row.id, "approved");
                }}
                className="bg-green-500 text-white flex whitespace-nowrap justify-center p-2 rounded text-xs hover:bg-green-600"
              >
                Approve
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusUpdate(row.id, "rejected");
                }}
                className="bg-yellow-500 text-white flex whitespace-nowrap justify-center p-2 rounded text-xs hover:bg-yellow-600"
              >
                Reject
              </button>
            </>
          )}
        </div>
      ),
    },
    {
      name: "Submitted",
      selector: (row) => new Date(row.created_at).toLocaleDateString(),
      sortable: true,
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
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Applications</h1>

      {/* ✅ Filter Tabs */}
      <div className="mb-4 flex gap-3 flex-wrap">
        {[
          { status: "", label: "All", bg: "bg-blue-600" },
          { status: "pending", label: "Pending", bg: "bg-yellow-500" },
          { status: "approved", label: "Approved", bg: "bg-green-500" },
          { status: "rejected", label: "Rejected", bg: "bg-red-500" },
          { status: "permit_issued", label: "Permit Issued", bg: "bg-blue-500" },
        ].map(({ status, label, bg }) => (
          <button
            key={status}
            className={`px-4 py-2 rounded font-medium transition ${
              filter === status
                ? `${bg} text-white`
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => {
              setFilter(status);
              fetchApplications(); // ✅ Refetch when switching tab
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ✅ Data Table */}
      <DataTable
        columns={columns}
        data={applications}
        pagination
        highlightOnHover
        customStyles={customStyles}
        onRowClicked={(row) => navigate(`/admin/applications/${row.id}`)}
      />
    </div>
  );
}
