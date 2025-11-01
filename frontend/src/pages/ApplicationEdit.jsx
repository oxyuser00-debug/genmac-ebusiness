import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { ArrowLeft } from "lucide-react";

export default function ApplicationEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState({
    business_name: "",
    business_type: "",
    address: "",
  });
  const [files, setFiles] = useState({
    barangay_clearance: null,
    dti_certificate: null,
    lease_contract: null,
  });

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

  const handleChange = (e) => {
    setApp({ ...app, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFiles({ ...files, [e.target.name]: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("business_name", app.business_name);
      formData.append("business_type", app.business_type);
      formData.append("address", app.address);

      // Automatically set status to "pending" after editing
      formData.append("status", "pending");

      if (files.barangay_clearance) formData.append("barangay_clearance", files.barangay_clearance);
      if (files.dti_certificate) formData.append("dti_certificate", files.dti_certificate);
      if (files.lease_contract) formData.append("lease_contract", files.lease_contract);

      await axios.put(`http://localhost:5000/api/applications/${id}`, formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });

      Swal.fire("Success", "Application updated and set to pending!", "success");
      navigate(`/application/${id}`);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to update application.", "error");
    }
  };

  return (
    <div className="p-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-6 transition"
      >
        <ArrowLeft size={18} /> Back
      </button>

      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <h1 className="text-2xl font-bold mb-6">Edit Application</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">Business Name</label>
            <input
              type="text"
              name="business_name"
              value={app.business_name}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Business Type</label>
            <input
              type="text"
              name="business_type"
              value={app.business_type}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Address</label>
            <input
              type="text"
              name="address"
              value={app.address}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Barangay Clearance</label>
            <input type="file" name="barangay_clearance" onChange={handleFileChange} />
          </div>

          <div>
            <label className="block mb-1 font-medium">DTI Certificate</label>
            <input type="file" name="dti_certificate" onChange={handleFileChange} />
          </div>

          <div>
            <label className="block mb-1 font-medium">Lease Contract</label>
            <input type="file" name="lease_contract" onChange={handleFileChange} />
          </div>

          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Update Application
          </button>
        </form>
      </div>
    </div>
  );
}
