import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { User } from "lucide-react";
import api from "../../services/api";

const EditUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    department: "",
    role: "",
    managerId: "",
    isActive: true,
  });
  const [loading, setLoading] = useState(false);

  // ✅ Fetch user details
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get(`/users/${id}`);
        const u = response.data?.data?.user;

        setUser(u);
        setFormData({
          name: u.name || "",
          email: u.email || "",
          phoneNumber: u.phoneNumber || "",
          department: u.department || "",
          role: u.role || "",
          managerId: u.managerId?._id || "",
          isActive: u.isActive,
        });
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    fetchUser();
  }, [id]);

  // ✅ Handle form input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ✅ Submit form -> update user
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.put(`/users/${id}`, formData);
      alert("User updated successfully ✅");
      navigate(`/users/${id}`); // redirect back to user detail
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Failed to update user ❌");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <p className="text-gray-600">Loading user details...</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Edit User</h1>

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        {/* Avatar */}
        <div className="text-center">
          {user.profileImage ? (
            <img
              src={user.profileImage}
              alt={user.name}
              className="h-24 w-24 rounded-full mx-auto mb-4 object-cover"
            />
          ) : (
            <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          )}
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input input-bordered w-full mt-1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input input-bordered w-full mt-1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              type="text"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              className="input input-bordered w-full mt-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Department</label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="input input-bordered w-full mt-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="select select-bordered w-full mt-1"
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Manager ID</label>
            <input
              type="text"
              name="managerId"
              value={formData.managerId}
              onChange={handleChange}
              className="input input-bordered w-full mt-1"
              placeholder="Manager's ID"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="checkbox"
            />
            <label className="text-sm font-medium text-gray-700">Active</label>
          </div>
        </div>

        {/* Submit */}
        <div className="text-right">
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary px-6"
          >
            {loading ? "Updating..." : "Update User"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditUser;
