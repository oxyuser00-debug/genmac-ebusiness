import { useEffect, useState } from "react";
import axios from "axios";
import DataTable from "react-data-table-component";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

export default function BusinessOwnersPage() {
  const [owners, setOwners] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOwners();
  }, []);

  const fetchOwners = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:5000/api/admin/business-owners", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOwners(res.data);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to load business owners", "error");
    }
  };

  const columns = [
    { name: "Owner Name", selector: (row) => row.owner_name, sortable: true },
    { name: "Email", selector: (row) => row.email, sortable: true },
    { name: "Address", selector: (row) => row.address || "-", sortable: true },
    {
      name: "Businesses",
      cell: (row) => (
        <div>
          {row.businesses.length === 0 ? (
            <span>No businesses</span>
          ) : (
            row.businesses.map((b) => (
              <div key={b.application_id} className="mb-1">
                <span
                  className="text-blue-600 cursor-pointer hover:underline"
                  onClick={() => navigate(`/admin/applications/${b.application_id}`)}
                >
                  {b.business_name}
                </span>{" "}
                - <span className="text-gray-600">{b.location || "No location"}</span>
              </div>
            ))
          )}
        </div>
      ),
      sortable: false,
    },
  ];

  const customStyles = {
    rows: {
      style: { cursor: "pointer", "&:hover": { backgroundColor: "#f9fafb" } },
    },
    headCells: {
      style: { backgroundColor: "#f3f4f6", color: "#374151", fontWeight: "600" },
    },
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Business Owners</h1>
      <DataTable
        columns={columns}
        data={owners}
        pagination
        highlightOnHover
        customStyles={customStyles}
      />
    </div>
  );
}
