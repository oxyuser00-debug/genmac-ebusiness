import { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Bar, Pie } from "react-chartjs-2";
import DataTable from "react-data-table-component";
import { File } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

// ✅ Base API URL
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function Reports() {
  const [overview, setOverview] = useState({});
  const [analytics, setAnalytics] = useState([]);
  const [applications, setApplications] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchOverview();
    fetchAnalytics();
    fetchApplications();
  }, []);

  const buildFileUrl = (file) => {
    if (!file) return null;
    if (file.startsWith("http://") || file.startsWith("https://")) return file;
    const clean = file.replace(/^\/+/, "");
    const path = clean.startsWith("uploads/") ? clean : `uploads/${clean}`;
    return `${API_BASE}/${path}`;
  };
  
  // ---------------- FETCH DATA ----------------
  const fetchOverview = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/overview`);
      setOverview(res.data || {});
    } catch (err) {
      console.error("Error fetching overview:", err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/analytics`);
      setAnalytics(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching analytics:", err);
    }
  };

  const fetchApplications = async (start = "", end = "") => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/all-applications`, {
        params: { start, end },
      });
      setApplications(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching applications:", err);
    }
  };

  // ---------------- FILTER ----------------
  const handleFilter = () => fetchApplications(startDate, endDate);
  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    fetchApplications();
  };

  // ---------------- EXPORTS ----------------
  const exportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "A4",
      });

      doc.setFontSize(16);
      doc.text("Business Permit Report", 40, 40);

      // Overview summary
      autoTable(doc, {
        startY: 60,
        head: [["Total", "Pending", "Approved", "Rejected", "Owners"]],
        body: [
          [
            overview.totalApplications || 0,
            overview.pendingApplications || 0,
            overview.approvedApplications || 0,
            overview.rejectedApplications || 0,
            overview.totalBusinessOwners || 0,
          ],
        ],
      });

      // Applications table
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [["Business Name", "Owner", "Address", "Type", "Status", "Date"]],
        body: applications.map((app) => [
          app.business_name,
          app.owner_name,
          app.address || "—",
          app.business_type || "—",
          app.status,
          new Date(app.created_at).toLocaleDateString(),
        ]),
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      });

      doc.save("report.pdf");
    } catch (error) {
      console.error("❌ Error generating PDF:", error);
    }
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      applications.map((app) => ({
        "Business Name": app.business_name,
        Owner: app.owner_name,
        Address: app.address || "—",
        Type: app.business_type || "—",
        Status: app.status,
        Date: new Date(app.created_at).toLocaleDateString(),
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Applications");
    XLSX.writeFile(wb, "report.xlsx");
  };

  const exportCSV = () => {
    const csvRows = [
      ["Business Name", "Owner", "Address", "Type", "Status", "Date"],
      ...applications.map((app) => [
        app.business_name,
        app.owner_name,
        app.address || "—",
        app.business_type || "—",
        app.status,
        new Date(app.created_at).toLocaleDateString(),
      ]),
    ];
    const csvContent = csvRows.map((e) => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ---------------- CHART DATA ----------------
  const barChartData = {
    labels: analytics?.map((a) => a.month) || [],
    datasets: [
      {
        label: "Applications per Month",
        data: analytics?.map((a) => a.total) || [],
        backgroundColor: "rgba(54, 162, 235, 0.6)",
        borderRadius: 8,
        barThickness: 40,
      },
    ],
  };

  const pieChartData = {
    labels: ["Pending", "Approved", "Rejected"],
    datasets: [
      {
        data: [
          overview.pendingApplications || 0,
          overview.approvedApplications || 0,
          overview.rejectedApplications || 0,
        ],
        backgroundColor: ["#facc15", "#22c55e", "#ef4444"],
      },
    ],
  };

  // ---------------- TABLE ----------------
  const columns = [
    { name: "Business Name", selector: (row) => row.business_name, sortable: true, wrap: true },
    { name: "Owner", selector: (row) => row.owner_name, sortable: true, wrap: true },
    { name: "Address", selector: (row) => row.address || "—", sortable: true, wrap: true },
    { name: "Type", selector: (row) => row.business_type || "—", sortable: true, wrap: true },
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
    { name: "Date", selector: (row) => new Date(row.created_at).toLocaleDateString(), sortable: true },
  ];

  // ---------------- RENDER ----------------
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-2">Reports</h1>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow h-[380px] flex flex-col">
          <h2 className="text-lg font-semibold mb-4">Applications per Month</h2>
          <div className="flex-1">
            <Bar
              data={barChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } },
              }}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow h-[380px] flex flex-col">
          <h2 className="text-lg font-semibold mb-4">Status Distribution</h2>
          <div className="flex-1">
            <Pie
              data={pieChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "bottom" } },
              }}
            />
          </div>
        </div>
      </div>

      {/* Filter + Export Row */}
      <div className="flex flex-wrap justify-between items-end gap-4 mt-8">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              className="border rounded px-2 py-1"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              className="border rounded px-2 py-1"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button onClick={handleFilter} className="px-4 py-2 bg-blue-600 text-white rounded">
            Filter
          </button>
          <button onClick={handleReset} className="px-4 py-2 bg-gray-300 text-gray-700 rounded">
            Reset
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={exportPDF} className="px-4 py-2 bg-blue-600 text-white rounded">
            PDF
          </button>
          <button onClick={exportExcel} className="px-4 py-2 bg-green-600 text-white rounded">
            Excel
          </button>
          <button onClick={exportCSV} className="px-4 py-2 bg-orange-500 text-white rounded">
            CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-4">All Applications</h2>
        <DataTable
          columns={columns}
          data={applications}
          pagination
          highlightOnHover
          responsive
          noHeader
        />
      </div>
    </div>
  );
}
