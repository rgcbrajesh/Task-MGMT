import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckSquare } from 'lucide-react';
import api from '../../services/api';

const TaskDetail = () => {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const response = await api.get(`/tasks/${id}`);
        setTask(response.data.data.task);
      } catch (error) {
        console.error('Error fetching task:', error);
      } finally {
        setLoading(false);
      }
    };    
    
    fetchTask();
  }, [id]);

  if (loading) {
    return <p className="text-gray-500">Loading task details...</p>;
  }

  if (!task) {
    return <p className="text-red-500">Task not found</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-medium
          ${task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
            task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
            task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-green-100 text-green-700'}`}>
          {task.priority}
        </span>
      </div>
      
      <div className="card p-6 shadow rounded-2xl">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Description</h3>
          <p className="text-gray-600">{task.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Status:</span>
            <p className="text-gray-600 capitalize">{task.status}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Deadline:</span>
            <p className="text-gray-600">{new Date(task.deadline).toLocaleString()}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Assigned By:</span>
            <p className="text-gray-600">{task.assignedBy?.name} ({task.assignedBy?.role})</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Assigned To:</span>
            <p className="text-gray-600">{task.assignedTo?.name} ({task.assignedTo?.role})</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Estimated Hours:</span>
            <p className="text-gray-600">{task.estimatedHours || '-'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Tags:</span>
            <p className="text-gray-600">{task.tags?.length ? task.tags.join(', ') : '-'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
