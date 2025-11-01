import { useEffect, useState, useRef } from "react";
import axios from "axios";
import Swal from "sweetalert2";

export default function Profile() {
  const [user, setUser] = useState({
    id: null,
    name: "",
    email: "",
    password: "",
    profile_pic: "defaultProfile.png",
  });
  const [focused, setFocused] = useState({
    name: false,
    password: false,
  });
  const [newPic, setNewPic] = useState(null);
  const fileInputRef = useRef();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:5000/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to load profile.", "error");
    }
  };

  const handleChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setNewPic(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("name", user.name);
      if (user.password) formData.append("password", user.password);
      if (newPic) formData.append("profile_pic", newPic);

      await axios.put(`http://localhost:5000/api/users/${user.id}`, formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });

      Swal.fire("Success", "Profile updated successfully!", "success");
      setUser({ ...user, password: "" });
      setNewPic(null);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to update profile.", "error");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Dashboard Overview</h1>
        <div className="flex justify-center">
        <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl shadow-md p-6 border border-gray-200 w-full "
        >
            <div className="flex flex-col md:flex-row gap-6 h-full">
            {/* Left column: profile picture */}
            <div className="flex-shrink-0 w-full md:w-1/3 flex justify-center items-start md:items-center">
                <img
                src={
                    newPic
                    ? URL.createObjectURL(newPic)
                    : `http://localhost:5000/uploads/profiles/${user.profile_pic}`
                }
                alt="Profile"
                className="w-full max-w-[300px] h-auto md:h-full rounded-full object-cover border cursor-pointer hover:opacity-80 transition"
                onClick={() => fileInputRef.current.click()}
                />
                <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                />
            </div>

            {/* Right column: user info */}
            <div className="flex-1 grid grid-cols-1 gap-4">
                {/* Name */}
                <div>
                <label className="block text-gray-700 font-medium mb-1">Name</label>
                <input
                    type="text"
                    name="name"
                    value={user.name}
                    onChange={handleChange}
                    onFocus={() => setFocused({ ...focused, name: true })}
                    onBlur={() => setFocused({ ...focused, name: false })}
                    className={`w-full px-3 py-2 rounded-lg border transition ${
                    focused.name ? "border-blue-500 bg-white" : "border-gray-300 bg-gray-100"
                    }`}
                />
                </div>

                {/* Email (readonly) */}
                <div>
                <label className="block text-gray-700 font-medium mb-1">Email</label>
                <input
                    type="email"
                    value={user.email}
                    readOnly
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-100 cursor-not-allowed"
                />
                </div>

                {/* Password */}
                <div>
                <label className="block text-gray-700 font-medium mb-1">New Password</label>
                <input
                    type="password"
                    name="password"
                    value={user.password}
                    onChange={handleChange}
                    onFocus={() => setFocused({ ...focused, password: true })}
                    onBlur={() => setFocused({ ...focused, password: false })}
                    placeholder="Leave blank to keep current password"
                    className={`w-full px-3 py-2 rounded-lg border transition ${
                    focused.password ? "border-blue-500 bg-white" : "border-gray-300 bg-gray-100"
                    }`}
                />
                </div>

                <button
                type="submit"
                className="mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                >
                Update Profile
                </button>
            </div>
            </div>
        </form>
        </div>
    </div>
  );
}
