import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Save, 
  X, 
  Upload, 
  File, 
  Trash2,
  Calendar,
  User,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Select from '../../components/UI/Select';
import TextArea from '../../components/UI/TextArea';
import Card from '../../components/UI/Card';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

const CreateTask = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    deadline: '',
    assignedTo: '',
    tags: '',
    estimatedHours: ''
  });
  
  const [attachments, setAttachments] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [errors, setErrors] = useState({});

  // Fetch users for assignment
  const { data: users, isLoading: usersLoading } = useQuery(
    'users-for-assignment',
    async () => {
      const response = await api.get('/users');
      return response.data.data.users;
    }
  );

  // Create task mutation
  const createTaskMutation = useMutation(
    async (taskData) => {
      const response = await api.post('/tasks', taskData);
      return response.data;
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('tasks');
        toast.success('Task created successfully');
        navigate(`/tasks/${data.data._id}`);
      },
      onError: (error) => {
        const errorMessage = error.response?.data?.message || 'Failed to create task';
        toast.error(errorMessage);
        
        // Handle validation errors
        if (error.response?.data?.errors) {
          setErrors(error.response.data.errors);
        }
      },
    }
  );

  // File upload mutation
  const uploadFileMutation = useMutation(
    async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.data;
    },
    {
      onError: (error) => {
        toast.error('Failed to upload file');
      },
    }
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFiles(true);
    
    try {
      const uploadPromises = files.map(file => uploadFileMutation.mutateAsync(file));
      const uploadedFiles = await Promise.all(uploadPromises);
      
      setAttachments(prev => [...prev, ...uploadedFiles]);
      toast.success(`${files.length} file(s) uploaded successfully`);
    } catch (error) {
      toast.error('Some files failed to upload');
    } finally {
      setUploadingFiles(false);
      e.target.value = ''; // Reset file input
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!formData.deadline) {
      newErrors.deadline = 'Due date is required';
    } else {
      const deadline = new Date(formData.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (deadline < today) {
        newErrors.deadline = 'Due date cannot be in the past';
      }
    }
    
    if (!formData.assignedTo) {
      newErrors.assignedTo = 'Please assign the task to someone';
    }
    
    if (formData.estimatedHours && (isNaN(formData.estimatedHours) || formData.estimatedHours <= 0)) {
      newErrors.estimatedHours = 'Estimated hours must be a positive number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }
    
    const taskData = {
      ...formData,
      tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
      estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
      attachments: attachments.map(file => ({
        filename: file.filename,
        originalName: file.originalName,
        size: file.size,
        mimetype: file.mimetype,
        url: file.url
      }))
    };
    
    createTaskMutation.mutate(taskData);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Task</h1>
          <p className="text-gray-600 mt-1">
            Create and assign a new task to team members
          </p>
        </div>
        
        <Button
          variant="outline"
          onClick={() => navigate('/tasks')}
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
          </div>
          <div className="card-body space-y-4">
            <Input
              label="Task Title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              error={errors.title}
              placeholder="Enter task title..."
              required
            />
            
            <TextArea
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              error={errors.description}
              placeholder="Describe the task in detail..."
              rows={4}
              required
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Priority"
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'urgent', label: 'Urgent' },
                ]}
                required
              />
              
              <Input
                label="Due Date"
                name="deadline"
                type="datetime-local"
                value={formData.deadline}
                onChange={handleInputChange}
                error={errors.deadline}
                required
              />
            </div>
          </div>
        </Card>

        {/* Assignment */}
        <Card>
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Assignment</h3>
          </div>
          <div className="card-body space-y-4">
            <Select
              label="Assign To"
              name="assignedTo"
              value={formData.assignedTo}
              onChange={handleInputChange}
              error={errors.assignedTo}
              options={[
                { value: '', label: 'Select a team member...' },
                ...(users || []).map(user => ({
                  value: user._id,
                  label: `${user.name} (${user.email})`
                }))
              ]}
              required
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Estimated Hours"
                name="estimatedHours"
                type="number"
                step="0.5"
                min="0"
                value={formData.estimatedHours}
                onChange={handleInputChange}
                error={errors.estimatedHours}
                placeholder="e.g., 8"
              />
              
              <Input
                label="Tags"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                placeholder="e.g., frontend, urgent, bug-fix"
                help="Separate tags with commas"
              />
            </div>
          </div>
        </Card>

        {/* File Attachments */}
        <Card>
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Attachments</h3>
          </div>
          <div className="card-body space-y-4">
            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop files here, or click to select
              </p>
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar"
              />
              <label htmlFor="file-upload">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingFiles}
                  className="cursor-pointer"
                >
                  {uploadingFiles ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Choose Files
                    </>
                  )}
                </Button>
              </label>
              <p className="text-xs text-gray-500 mt-2">
                Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG, GIF, ZIP, RAR (Max 10MB each)
              </p>
            </div>

            {/* Uploaded Files */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900">Uploaded Files</h4>
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <File className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {file.originalName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/tasks')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createTaskMutation.isLoading}
          >
            {createTaskMutation.isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Task
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateTask;