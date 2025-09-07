import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckSquare } from "lucide-react";
import api from "../../services/api";
import toast from "react-hot-toast";

const EditTask = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [role, setRole] = useState(""); // ✅ user role
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    assignedTo: "",
    deadline: "",
    estimatedHours: "",
    tags: "",
    status: "pending",
  });
  const [loading, setLoading] = useState(false);

  // ✅ Fetch task details + user role
  useEffect(() => {
    const fetchTask = async () => {
      try {
        const response = await api.get(`/tasks/${id}`);
        const t = response.data?.data?.task;
        setTask(t);


        setFormData({
          title: t.title || "",
          description: t.description || "",
          priority: t.priority || "medium",
          assignedTo: t.assignedTo?._id || "",
          deadline: t.deadline
            ? new Date(t.deadline).toISOString().slice(0, 16)
            : "",
          estimatedHours: t.estimatedHours || "",
          tags: t.tags?.join(", ") || "",
          status: t.status || "pending",
        });
      } catch (error) {
        console.error("Error fetching task:", error);
        toast.error("Failed to load task details ❌");
      }
    };
    const fetchLoginUser = async () => {
      try {
        const response = await api.get("/auth/me");
        console.log(response);
        setRole(response.data?.data?.user?.role || "employee");
      } catch (error) {
        console.error("Error fetching login user:", error);
      }
    };
    fetchLoginUser();
    fetchTask();
  }, [id]);

  // ✅ Handle form input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ✅ Submit -> role based
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (role === "employee") {
        // 🔹 Employee → sirf status update
        await api.put(`/tasks/${id}/status`, { status: formData.status });
        toast.success("Task status updated successfully ✅");
      } else {
        // 🔹 Manager/SuperAdmin → full task update
        await api.put(`/tasks/${id}`, {
          ...formData,
          tags: formData.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        });
        toast.success("Task updated successfully ✅");
      }

      navigate(`/tasks/${id}`);
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error(error.response?.data?.message || "Failed to update task ❌");
    } finally {
      setLoading(false);
    }
  };

  if (!task) {
    return <p className="text-gray-600">Loading task details...</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        {role === "employee" ? "Update Task Status" : "Edit Task"}
      </h1>

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        {/* Icon */}
        <div className="text-center">
          <CheckSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-semibold">{task.title}</p>
          <p className="text-sm text-gray-500">{task.description}</p>
        </div>

        {/* 🔹 Employee = only Status field */}
        {role === "employee" ? (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="select select-bordered w-full mt-1"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        ) : (
          // 🔹 Manager / SuperAdmin = full form
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="input input-bordered w-full mt-1"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="4"
                className="textarea textarea-bordered w-full mt-1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="select select-bordered w-full mt-1"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="select select-bordered w-full mt-1"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Assigned To (User ID)
              </label>
              <input
                type="text"
                name="assignedTo"
                value={formData.assignedTo}
                onChange={handleChange}
                className="input input-bordered w-full mt-1"
                placeholder="User ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Deadline
              </label>
              <input
                type="datetime-local"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                className="input input-bordered w-full mt-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Estimated Hours
              </label>
              <input
                type="number"
                name="estimatedHours"
                value={formData.estimatedHours}
                onChange={handleChange}
                className="input input-bordered w-full mt-1"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                className="input input-bordered w-full mt-1"
                placeholder="e.g. FE, Backend"
              />
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="text-right">
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary px-6"
          >
            {loading
              ? role === "employee"
                ? "Updating Status..."
                : "Updating..."
              : role === "employee"
              ? "Update Status"
              : "Update Task"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditTask;
