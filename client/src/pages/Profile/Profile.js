import React, { useEffect, useState } from "react";
import { User } from "lucide-react";
import api from "../../services/api";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch user profile
  const getProfileDetails = async () => {
    try {
      const response = await api.get(`/auth/me`);
      setUser(response.data?.data?.user);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getProfileDetails();
  }, []);

  if (loading) {
    return <p className="text-gray-600">Loading profile...</p>;
  }

  if (!user) {
    return <p className="text-red-600">Failed to load profile ❌</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      <div className="card">
        <div className="card-body text-center py-12">
          {user.profileImage ? (
            <img
              src={user.profileImage}
              alt={user.name}
              className="h-24 w-24 rounded-full mx-auto mb-4 object-cover"
            />
          ) : (
            <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          )}

          <h3 className="text-lg font-medium text-gray-900 mb-2">{user.name}</h3>
          <p className="text-gray-600">{user.email}</p>

          <div className="mt-4 text-gray-700 space-y-2">
            <p>
              <span className="font-medium">Department:</span>{" "}
              {user.department || "N/A"}
            </p>
            <p>
              <span className="font-medium">Role:</span> {user.role}
            </p>
            <p>
              <span className="font-medium">Status:</span>{" "}
              {user.isActive ? (
                <span className="text-green-600">Active</span>
              ) : (
                <span className="text-red-600">Inactive</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
