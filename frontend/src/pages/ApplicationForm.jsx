import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import api from "../api/axios";

export default function ApplicationForm() {
  const [form, setForm] = useState({
    business_name: "",
    business_type: "",
    address: "",
    barangay_clearance: null,
    dti_certificate: null,
    lease_contract: null,
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setForm({ ...form, [name]: files[0] });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const confirm = await Swal.fire({
      title: "Submit Application?",
      text: "Please make sure all information is correct before submitting.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, submit",
    });

    if (!confirm.isConfirmed) return;

    try {
      setLoading(true);

      const formData = new FormData();
      for (const key in form) {
        formData.append(key, form[key]);
      }

      await api.post("/applications", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      Swal.fire({
        icon: "success",
        title: "Application Submitted",
        text: "Your business application has been submitted successfully.",
        confirmButtonColor: "#2563eb",
      });

      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Submission Failed",
        text:
          err.response?.data?.error ||
          "Something went wrong while submitting your application.",
        confirmButtonColor: "#dc2626",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-lg">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          New Business Application
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-600 text-sm mb-1">
              Business Name
            </label>
            <input
              name="business_name"
              type="text"
              required
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g., GenMac Enterprises"
            />
          </div>

          <div>
            <label className="block text-gray-600 text-sm mb-1">
              Business Type
            </label>
            <input
              name="business_type"
              type="text"
              required
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g., Retail, Food Service, Consultancy"
            />
          </div>

          <div>
            <label className="block text-gray-600 text-sm mb-1">
              Business Address
            </label>
            <input
              name="address"
              type="text"
              required
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g., Purok 1, Barangay Central, City"
            />
          </div>

          {/* Additional Documents Section */}
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              Additional Documents <span className="text-gray-500 text-xs">(Optional)</span>
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-gray-600 text-sm mb-1">
                  Barangay Clearance
                </label>
                <input
                  type="file"
                  name="barangay_clearance"
                  accept=".pdf,.jpg,.png"
                  onChange={handleChange}
                  className="block w-full text-sm text-gray-700 border border-gray-300 rounded-lg p-2.5 cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-600 text-sm mb-1">
                  DTI/SEC Certificate
                </label>
                <input
                  type="file"
                  name="dti_certificate"
                  accept=".pdf,.jpg,.png"
                  onChange={handleChange}
                  className="block w-full text-sm text-gray-700 border border-gray-300 rounded-lg p-2.5 cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-600 text-sm mb-1">
                  Lease Contract / Proof of Ownership
                </label>
                <input
                  type="file"
                  name="lease_contract"
                  accept=".pdf,.jpg,.png"
                  onChange={handleChange}
                  className="block w-full text-sm text-gray-700 border border-gray-300 rounded-lg p-2.5 cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-5 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg transition disabled:opacity-70"
          >
            {loading ? "Submitting..." : "Submit Application"}
          </button>
        </form>
      </div>
    </div>
  );
}
