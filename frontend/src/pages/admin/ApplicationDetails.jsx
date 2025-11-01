import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";

export default function AdminApplicationDetails() {
  const { id } = useParams();
  const [app, setApp] = useState(null);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    fetchApplication();
  }, [id]);

  const fetchApplication = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`http://localhost:5000/api/applications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setApp(res.data);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to load application details.", "error");
    }
  };

  const handleStatusUpdate = async (status) => {
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
        if (fee === null) return; // cancelled
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
        if (!remarks) return; // cancelled
        payload.remarks = remarks;
        payload.status = "rejected";
      }

      const token = localStorage.getItem("token");
      await axios.put(
        `http://localhost:5000/api/admin/applications/${id}/status`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Swal.fire(
        "Success",
        `Application ${status === "approved" ? "approved" : "rejected"} successfully.`,
        "success"
      );

      fetchApplication();
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to update status", "error");
    }
  };

  if (!app)
    return (
      <div className="p-6 text-center text-gray-600">
        <p>Loading application details...</p>
      </div>
    );

  return (
    <div className="p-6">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-6 transition"
      >
        <ArrowLeft size={18} /> Back
      </button>

      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800">{app.business_name}</h1>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              app.status === "approved"
                ? "bg-green-100 text-green-700"
                : app.status === "pending"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {app.status.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
          <p>
            <strong>Business Type:</strong> {app.business_type}
          </p>
          <p>
            <strong>Address:</strong> {app.address}
          </p>
          <p>
            <strong>Date Submitted:</strong> {new Date(app.created_at).toLocaleDateString()}
          </p>
          <p>
            <strong>Last Updated:</strong> {new Date(app.updated_at).toLocaleDateString()}
          </p>
          {app.status === "approved" && (
            <p>
              <strong>Amount to Pay:</strong> ${app.fee?.toFixed(2) || "0.00"}
            </p>
          )}
          {app.status === "rejected" && (
            <p>
              <strong>Remarks:</strong> {app.remarks || "No remarks provided"}
            </p>
          )}
        </div>

        {/* Uploaded Documents */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Uploaded Documents</h2>
          <ul className="list-disc list-inside space-y-1">
            {app.barangay_clearance && (
              <li>
                <a
                  href={`http://localhost:5000/uploads/${app.barangay_clearance}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Barangay Clearance
                </a>
              </li>
            )}
            {app.dti_certificate && (
              <li>
                <a
                  href={`http://localhost:5000/uploads/${app.dti_certificate}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  DTI Certificate
                </a>
              </li>
            )}
            {app.lease_contract && (
              <li>
                <a
                  href={`http://localhost:5000/uploads/${app.lease_contract}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Lease Contract
                </a>
              </li>
            )}
            {!app.barangay_clearance &&
              !app.dti_certificate &&
              !app.lease_contract && (
                <p className="text-gray-500 text-sm">No documents uploaded for this application.</p>
              )}
          </ul>
        </div>

        {/* Actions */}
        {app.status === "pending" && (
          <div className="flex gap-3 mt-8">
            <button
              onClick={() => handleStatusUpdate("approved")}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            >
              <CheckCircle size={18} /> Approve
            </button>
            <button
              onClick={() => handleStatusUpdate("rejected")}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
            >
              <XCircle size={18} /> Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
