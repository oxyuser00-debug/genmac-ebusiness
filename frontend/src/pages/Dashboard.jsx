import { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import Swal from "sweetalert2";
import DataTable from "react-data-table-component";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Clock, XCircle, BarChart3, FileCheck2 } from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    permit_issued: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [recent, setRecent] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:5000/api/analytics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(res.data.stats);
      setChartData(res.data.chart);
      setRecent(res.data.recent);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to load dashboard data", "error");
    }
  };

  // ✅ Updated cardData with Permit Issued replacing “Business Owners”
  const cardData = [
    {
      label: "Total Applications",
      value: stats.total,
      icon: <BarChart3 className="w-6 h-6 text-blue-600" />,
      bg: "bg-blue-100",
      text: "text-blue-800",
    },
    {
      label: "Approved",
      value: stats.approved,
      icon: <CheckCircle className="w-6 h-6 text-green-600" />,
      bg: "bg-green-100",
      text: "text-green-800",
    },
    {
      label: "Pending",
      value: stats.pending,
      icon: <Clock className="w-6 h-6 text-yellow-600" />,
      bg: "bg-yellow-100",
      text: "text-yellow-800",
    },
    {
      label: "Rejected",
      value: stats.rejected,
      icon: <XCircle className="w-6 h-6 text-red-600" />,
      bg: "bg-red-100",
      text: "text-red-800",
    },
    {
      label: "Permit Issued",
      value: stats.permit_issued,
      icon: <FileCheck2 className="w-6 h-6 text-blue-600" />,
      bg: "bg-blue-100",
      text: "text-blue-800",
    },
  ];

  // ✅ DataTable columns
  const columns = [
    {
      name: "Business Name",
      selector: (row) => row.business_name,
      sortable: true,
    },
    {
      name: "Status",
      cell: (row) => {
        let bgColor = "bg-gray-100 text-gray-700";
        let displayText = row.status
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());

        if (row.status === "approved") {
          bgColor = "bg-green-100 text-green-700";
        } else if (row.status === "pending") {
          bgColor = "bg-yellow-100 text-yellow-700";
        } else if (row.status === "rejected") {
          bgColor = "bg-red-100 text-red-700";
        } else if (row.status === "permit_issued") {
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
      name: "Date",
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
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Dashboard Overview</h1>

      {/* ✅ Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        {cardData.map((card, i) => (
          <div
            key={i}
            className={`${card.bg} ${card.text} rounded-xl shadow-md p-5 flex items-center justify-between transition transform hover:-translate-y-1 hover:shadow-lg`}
          >
            <div>
              <p className="text-sm font-medium opacity-80">{card.label}</p>
              <h2 className="text-3xl font-bold">{card.value}</h2>
            </div>
            {card.icon}
          </div>
        ))}
      </div>

      {/* ✅ Line Chart */}
      <div className="bg-white shadow-md rounded-xl p-5 mb-8 border border-gray-200">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">
          Application Trends
        </h2>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="approved" stroke="#22c55e" strokeWidth={3} />
            <Line type="monotone" dataKey="pending" stroke="#facc15" strokeWidth={3} />
            <Line type="monotone" dataKey="rejected" stroke="#ef4444" strokeWidth={3} />
            <Line type="monotone" dataKey="permit_issued" stroke="#3b82f6" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ✅ Data Table */}
      <div className="bg-white shadow-md rounded-xl p-5 border border-gray-200">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">
          Recent Applications
        </h2>
        <DataTable
          columns={columns}
          data={recent}
          pagination
          highlightOnHover
          customStyles={customStyles}
          onRowClicked={(row) => navigate(`/application/${row.id}`)}
        />
      </div>
    </div>
  );
}
