import { useEffect, useState } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import Swal from "sweetalert2";
import DataTable from "react-data-table-component";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Clock, Users, BarChart3 } from "lucide-react";

export default function DashboardPage() {
  const [overview, setOverview] = useState(null);
  const [recent, setRecent] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const navigate = useNavigate();

  const COLORS = ["#f59e0b", "#10b981", "#ef4444", "#3b82f6"]; // Pending, Approved, Rejected, Permit Issued

  useEffect(() => {
    fetchOverview();
    fetchRecent();
    fetchMonthly();
  }, []);

  const fetchOverview = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/admin/overview");
      setOverview(res.data);
    } catch (err) {
      console.error("Error fetching overview:", err);
      Swal.fire("Error", "Failed to load overview data", "error");
    }
  };

  const fetchRecent = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/admin/recent-activity");
      setRecent(res.data);
    } catch (err) {
      console.error("Error fetching recent activity:", err);
      Swal.fire("Error", "Failed to load recent activity", "error");
    }
  };

  const fetchMonthly = async () => {
    try {
        const res = await axios.get("http://localhost:5000/api/admin/analytics");
        setMonthly(res.data.monthly); // ✅ only keep the monthly array
    } catch (err) {
        console.error("Error fetching analytics:", err);
        Swal.fire("Error", "Failed to load analytics data", "error");
    }
  };

  if (!overview) {
    return <div className="text-center text-gray-500 mt-10">Loading dashboard...</div>;
  }

  const donutData = [
    { name: "Pending", value: Number(overview.pendingApplications || 0) },
    { name: "Approved", value: Number(overview.approvedApplications || 0) },
    { name: "Rejected", value: Number(overview.rejectedApplications || 0) },
    { name: "Permit Issued", value: Number(overview.permitIssuedApplications || 0) },
  ];

  // ✅ Card data with clickable navigation
  const cardData = [
    {
      label: "Total Applications",
      value: overview.totalApplications,
      icon: <BarChart3 className="w-6 h-6 text-blue-600" />,
      bg: "bg-blue-100",
      text: "text-blue-800",
      onClick: () => navigate("/admin/applications"),
    },
    {
      label: "Approved",
      value: overview.approvedApplications,
      icon: <CheckCircle className="w-6 h-6 text-green-600" />,
      bg: "bg-green-100",
      text: "text-green-800",
      onClick: () => navigate("/admin/applications?status=approved"),
    },
    {
      label: "Pending",
      value: overview.pendingApplications,
      icon: <Clock className="w-6 h-6 text-yellow-600" />,
      bg: "bg-yellow-100",
      text: "text-yellow-800",
      onClick: () => navigate("/admin/applications?status=pending"),
    },
    {
      label: "Business Owners",
      value: overview.totalBusinessOwners,
      icon: <Users className="w-6 h-6 text-violet-600" />,
      bg: "bg-violet-100",
      text: "text-violet-800",
      onClick: () => navigate("/admin/business-owners"),
    },
  ];

  // ✅ DataTable setup
  const columns = [
    { name: "Business Name", selector: (row) => row.business_name, sortable: true },
    { name: "Owner", selector: (row) => row.owner_name, sortable: true },
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
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {cardData.map((card, i) => (
          <div
            key={i}
            onClick={card.onClick}
            className={`${card.bg} ${card.text} rounded-xl shadow-md p-5 flex items-center justify-between transition transform hover:-translate-y-1 hover:shadow-lg cursor-pointer`}
          >
            <div>
              <p className="text-sm font-medium opacity-80">{card.label}</p>
              <h2 className="text-3xl font-bold">{card.value}</h2>
            </div>
            {card.icon}
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Donut Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">
            Application Status Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={donutData}
                dataKey="value"
                nameKey="name"
                outerRadius={120}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {donutData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Line Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">
            Applications Per Month
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* DataTable for Recent Activity */}
      <div className="bg-white p-6 rounded-2xl shadow-md">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">Recent Applications</h2>
        <DataTable
          columns={columns}
          data={recent}
          pagination
          highlightOnHover
          customStyles={customStyles}
          onRowClicked={(row) => navigate(`/admin/applications/${row.id}`)}
        />
      </div>
    </div>
  );
}
