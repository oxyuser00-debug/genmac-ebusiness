import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { ArrowLeft, Edit, Trash2, CreditCard, Download } from "lucide-react";

export default function ApplicationDetails() {
  const { id } = useParams();
  const [app, setApp] = useState(null);
  const navigate = useNavigate();

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

  const handleDelete = async () => {
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
        await axios.delete(`http://localhost:5000/api/applications/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        Swal.fire("Deleted!", "Application has been deleted.", "success");
        navigate("/applications");
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Failed to delete application.", "error");
      }
    }
  };

  const handlePayNow = () => {
    navigate(`/payment/${id}`);
  };

  const handleDownloadPermit = () => {
    if (!app?.permit_file) {
      Swal.fire("Info", "Permit file not available yet.", "info");
      return;
    }

    const fileUrl = `http://localhost:5000/${
      app.permit_file.startsWith("/") ? app.permit_file.slice(1) : app.permit_file
    }`;
    window.open(fileUrl, "_blank");
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
            className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
              app.status === "approved"
                ? "bg-green-100 text-green-700"
                : app.status === "pending"
                ? "bg-yellow-100 text-yellow-700"
                : app.status === "rejected"
                ? "bg-red-100 text-red-700"
                : app.status === "permit_issued"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {app.status.replace("_", " ")}
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

          {/* Conditional: Fee or Remarks */}
          {app.status === "approved" && (
            <p>
              <strong>Amount to Pay:</strong> ₱{app.fee?.toFixed(2) || "0.00"}
            </p>
          )}
          {app.status === "rejected" && (
            <p className="text-red-600">
              <strong>Remarks:</strong> {app.remarks || "No remarks provided."}
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

        {/* ✅ Permit File Section */}
        {app.permit_file && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-green-700 font-medium mb-2">
              🎉 Your business permit has been issued!
            </p>
            <button
              onClick={handleDownloadPermit}
              className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition"
            >
              <Download size={18} /> Download Permit (PDF)
            </button>
          </div>
        )}

        {/* Actions */}
        {app.status !== "approved" && app.status !== "permit_issued" && (
          <div className="flex flex-col md:flex-row gap-3 mt-8">
            <button
              onClick={() => navigate(`/application/edit/${app.id}`)}
              className="flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition"
            >
              <Edit size={18} /> Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
            >
              <Trash2 size={18} /> Delete
            </button>
          </div>
        )}

        {/* Pay Now button if approved */}
        {app.status === "approved" && (
          <div className="mt-4">
            <button
              onClick={handlePayNow}
              className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition"
            >
              <CreditCard size={18} /> Pay Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
