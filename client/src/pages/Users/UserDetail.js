import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { User } from 'lucide-react';
import api from '../../services/api';

const UserDetail = () => {
  const { id } = useParams();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get(`/users/${id}`);
        setUser(response.data?.data?.user); // ✅ response se user object set karo
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };    
    
    fetchUser();
  }, [id]);
  console.log(user);
  if (!user) {
    return <p className="text-gray-600">Loading user details...</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">User Details</h1>
      
      <div className="card">
        <div className="card-body text-center py-8">
          {user.profileImage ? (
            <img
              src={user.profileImage}
              alt={user.name}
              className="h-24 w-24 rounded-full mx-auto mb-4 object-cover"
            />
          ) : (
            <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          )}

          <h3 className="text-xl font-semibold text-gray-900">{user.name}</h3>
          <p className="text-gray-600">{user.role}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 text-left">
          <div>
            <p className="text-sm font-medium text-gray-500">Email</p>
            <p className="text-gray-900">{user.email}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Phone</p>
            <p className="text-gray-900">{user.phoneNumber || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Department</p>
            <p className="text-gray-900">{user.department || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Manager</p>
            <p className="text-gray-900">
              {user.managerId ? user.managerId.name : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Status</p>
            <span
              className={`px-2 py-1 rounded text-sm font-medium ${
                user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {user.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Last Login</p>
            <p className="text-gray-900">
              {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Created At</p>
            <p className="text-gray-900">
              {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Updated At</p>
            <p className="text-gray-900">
              {new Date(user.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetail;
