import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Save, X, Trash2, Calendar, Clock, AlertCircle, User, Users, Building2,
  FileText, MessageSquare, Send, Download, Paperclip, Upload, Reply, Percent, Link, ExternalLink, Plus,
  ClipboardList
} from 'lucide-react';
import { format } from 'date-fns';
import useAuthStore from '../store/authStore';
import api, { workLogAPI } from '../services/api';
import CommentThread from '../components/CommentThread';
import CommentInput from '../components/CommentInput';
import DailyWorkLog from '../components/DailyWorkLog';

const TaskDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  // Basic Task State
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  
  // Extended Features State
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [links, setLinks] = useState([]);
  const [workLogs, setWorkLogs] = useState([]);
  const [showWorkLogModal, setShowWorkLogModal] = useState(false);
  
  // UI State
  const [activeTab, setActiveTab] = useState('details');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [linkForm, setLinkForm] = useState({ title: '', url: '', description: '' });
  const [editingLink, setEditingLink] = useState(null);

  useEffect(() => {
    fetchTaskDetails();
  }, [id]);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      const [
        taskRes, commentsRes, attachmentsRes, deptsRes, usersRes, participantsRes, linksRes, workLogsRes
      ] = await Promise.all([
        api.get(`/tasks/${id}`),
        api.get(`/tasks/${id}/comments`).catch(() => ({ data: { data: { comments: [] } } })),
        api.get(`/tasks/${id}/attachments`).catch(() => ({ data: { data: { attachments: [] } } })),
        api.get('/departments'),
        api.get('/users/basic').catch(() => ({ data: { users: [] } })),
        api.get(`/tasks/${id}/participants`).catch(() => ({ data: { participants: [] } })),
        api.get(`/tasks/${id}/links`).catch(() => ({ data: { data: { links: [] } } })),
        workLogAPI.getByTask(id).catch(() => ({ data: [] }))
      ]);

      const taskData = taskRes.data.data || taskRes.data.task;
      setTask(taskData);
      setFormData({
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority,
        status: taskData.status,
        due_date: taskData.due_date?.split('T')[0],
        assigned_to_id: taskData.assigned_to_id || '',
        department: taskData.department || '',
        progress: taskData.progress || 0
      });
      
      // Extended Features Data
      setComments(commentsRes.data.data?.comments || commentsRes.data.comments || []);
      setParticipants(participantsRes.data.participants || []);
      setAttachments(attachmentsRes.data.data?.attachments || []);
      setWorkLogs(workLogsRes.data || []);
      setLinks(linksRes.data.data?.links || linksRes.data.links || []);
      
      // Basic data
      setDepartments(deptsRes.data.departments || []);
      setUsers(usersRes.data.users || []);
      
    } catch (error) {
      console.error('Error fetching task details:', error);
      if (error.response?.status === 404) {
        alert('Task not found');
      } else {
        alert('Failed to fetch task details');
      }
      navigate('/dashboard/tasks');
    } finally {
      setLoading(false);
    }
  };

  // Comment Handlers
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      // Create the comment
      await api.post(`/tasks/${id}/comments`, { 
        comment: newComment,
        parent_comment_id: replyingTo?.id || null
      });

      // Reset form
      setNewComment('');
      setReplyingTo(null);
      
      // Refresh comments
      const response = await api.get(`/tasks/${id}/comments`);
      setComments(response.data.data?.comments || response.data.comments || []);
      
    } catch (error) {
      console.error('Error adding comment:', error);
      alert(error.response?.data?.message || 'Failed to add comment');
    }
  };

  const handleEditComment = async (commentId, newText) => {
    try {
      await api.put(`/comments/${commentId}`, {
        comment: newText
      });
      
      // Refresh comments
      const response = await api.get(`/tasks/${id}/comments`);
      setComments(response.data.data?.comments || response.data.comments || []);
    } catch (error) {
      console.error('Error editing comment:', error);
      alert(error.response?.data?.message || 'Failed to edit comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/comments/${commentId}`);
      
      // Refresh comments
      const response = await api.get(`/tasks/${id}/comments`);
      setComments(response.data.data?.comments || response.data.comments || []);
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert(error.response?.data?.message || 'Failed to delete comment');
    }
  };

  const handleReply = (commentId, commentAuthor) => {
    setReplyingTo({ id: commentId, name: commentAuthor });
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setNewComment('');
  };

  // Link Handlers
  const handleAddLink = async (e) => {
    e.preventDefault();
    if (!linkForm.title.trim() || !linkForm.url.trim()) {
      alert('Title and URL are required');
      return;
    }

    try {
      if (editingLink) {
        await api.put(`/links/${editingLink.id}`, linkForm);
      } else {
        await api.post(`/tasks/${id}/links`, linkForm);
      }
      
      // Refresh links
      const response = await api.get(`/tasks/${id}/links`);
      setLinks(response.data.data?.links || response.data.links || []);
      
      // Reset form
      setLinkForm({ title: '', url: '', description: '' });
      setShowAddLinkModal(false);
      setEditingLink(null);
    } catch (error) {
      console.error('Error saving link:', error);
      alert(error.response?.data?.message || 'Failed to save link');
    }
  };

  const handleEditLink = (link) => {
    setEditingLink(link);
    setLinkForm({
      title: link.title,
      url: link.url,
      description: link.description || ''
    });
    setShowAddLinkModal(true);
  };

  const handleDeleteLink = async (linkId) => {
    if (!confirm('Delete this link?')) return;

    try {
      await api.delete(`/links/${linkId}`);
      
      // Refresh links
      const response = await api.get(`/tasks/${id}/links`);
      setLinks(response.data.data?.links || response.data.links || []);
    } catch (error) {
      console.error('Error deleting link:', error);
      alert(error.response?.data?.message || 'Failed to delete link');
    }
  };

  const closeAddLinkModal = () => {
    setShowAddLinkModal(false);
    setEditingLink(null);
    setLinkForm({ title: '', url: '', description: '' });
  };

  // File Upload Handler
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingFile(true);
      await api.post(`/tasks/${id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Refresh attachments
      const response = await api.get(`/tasks/${id}/attachments`);
      setAttachments(response.data.data?.attachments || []);
      
      // Clear the input
      e.target.value = '';
    } catch (error) {
      console.error('Error uploading file:', error);
      alert(error.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) return;

    try {
      await api.delete(`/tasks/${id}/attachments/${attachmentId}`);
      
      // Refresh attachments
      const response = await api.get(`/tasks/${id}/attachments`);
      setAttachments(response.data.data?.attachments || []);
    } catch (error) {
      console.error('Error deleting attachment:', error);
      alert(error.response?.data?.message || 'Failed to delete attachment');
    }
  };

  const handleDownloadAttachment = async (attachment) => {
    try {
      const response = await api.get(`/tasks/${id}/attachments/${attachment.id}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      alert('Failed to download attachment');
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Calculate status based on progress value
  const calculateStatusFromProgress = (progress, currentStatus) => {
    // Don't auto-change status if task is on-hold, cancelled, or pending
    const protectedStatuses = ['on-hold', 'cancelled', 'pending'];
    if (protectedStatuses.includes(currentStatus)) {
      return currentStatus;
    }

    // Auto status logic based on progress
    if (progress === 0) {
      return 'todo';
    } else if (progress === 100) {
      return 'completed';
    } else if (progress > 0 && progress < 100) {
      return 'in-progress';
    }

    return currentStatus;
  };

  // Handle progress change with automatic status update
  const handleProgressChange = (newProgress) => {
    const newStatus = calculateStatusFromProgress(newProgress, formData.status);
    const statusChanged = newStatus !== formData.status;

    setFormData({
      ...formData,
      progress: newProgress,
      status: newStatus
    });

    // Show visual feedback if status changed
    if (statusChanged) {
      console.log(`Progress updated to ${newProgress}%, status automatically changed to "${newStatus}"`);
    }
  };

  // Quick update progress for employees (without full form submission)
  const handleQuickProgressUpdate = async () => {
    if (user?.role !== 'employee') return;
    
    try {
      const updatePayload = {
        status: formData.status,
        progress: formData.progress
      };

      const statusChangedMessage = task.status !== formData.status 
        ? ` Status changed from "${task.status}" to "${formData.status}".`
        : '';

      await api.put(`/tasks/${id}`, updatePayload);
      await fetchTaskDetails();
      
      // Success feedback
      const successMsg = `Progress updated to ${formData.progress}%!${statusChangedMessage}`;
      alert(successMsg);
    } catch (error) {
      console.error('Error updating progress:', error);
      alert(error.response?.data?.message || 'Failed to update progress');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      let updatePayload;
      
      // Employees can only update status and progress
      if (user?.role === 'employee') {
        updatePayload = {
          status: formData.status,
          progress: formData.progress
        };
      } else {
        // Admins and dept_admins can update all fields
        updatePayload = {
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          status: formData.status,
          department: formData.department,
          progress: formData.progress
        };

        // Only include dueDate if it's provided and valid
        if (formData.due_date) {
          updatePayload.dueDate = formData.due_date;
        }

        // Only include assignedToId if it's provided
        if (formData.assigned_to_id) {
          updatePayload.assignedToId = formData.assigned_to_id;
        }
      }

      console.log('Updating task with payload:', updatePayload);
      
      // Check if status changed due to progress update
      const statusChangedMessage = task.status !== formData.status 
        ? ` Status automatically changed from "${task.status}" to "${formData.status}".`
        : '';
      
      await api.put(`/tasks/${id}`, updatePayload);
      await fetchTaskDetails();
      setIsEditing(false);
      alert(`Task updated successfully!${statusChangedMessage}`);
    } catch (error) {
      console.error('Error updating task:', error);
      console.error('Error response:', error.response?.data);
      console.error('Validation errors:', JSON.stringify(error.response?.data?.errors, null, 2));
      
      // Show detailed error message
      const errorMsg = error.response?.data?.errors?.[0]?.msg || error.response?.data?.message || 'Failed to update task';
      alert(errorMsg);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      await api.delete(`/tasks/${id}`);
      alert('Task deleted successfully');
      navigate('/dashboard/tasks');
    } catch (error) {
      console.error('Error deleting task:', error);
      alert(error.response?.data?.message || 'Failed to delete task');
    }
  };

  const cancelEdit = () => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        due_date: task.due_date?.split('T')[0],
        assigned_to_id: task.assigned_to_id || '',
        department: task.department || '',
        progress: task.progress || 0
      });
    }
    setIsEditing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'todo':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'on-hold':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Task not found</h3>
        <button
          onClick={() => navigate('/dashboard/tasks')}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Back to Tasks
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add/Edit Link Modal */}
      {showAddLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {editingLink ? 'Edit Link' : 'Add New Link'}
              </h3>
              <button
                onClick={closeAddLinkModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddLink} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={linkForm.title}
                  onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., Design Mockups"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL <span className="text-red-600">*</span>
                </label>
                <input
                  type="url"
                  value={linkForm.url}
                  onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="https://example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={linkForm.description}
                  onChange={(e) => setLinkForm({ ...linkForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows="3"
                  placeholder="Brief description of the link..."
                  maxLength="500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {linkForm.description.length}/500 characters
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  {editingLink ? 'Update Link' : 'Add Link'}
                </button>
                <button
                  type="button"
                  onClick={closeAddLinkModal}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Task Details</h1>
            <p className="text-gray-600 mt-1">View and manage task information</p>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Edit button - Only for admins */}
          {!isEditing && (user?.role === 'super_admin' || user?.role === 'dept_admin') && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              {(user?.role === 'super_admin' || user?.id === task.created_by_id) && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Enhanced Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'details'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-1" />
            Details
          </button>
          <button
            onClick={() => setActiveTab('worklogs')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'worklogs'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <ClipboardList className="w-4 h-4 inline mr-1" />
            Work Logs ({workLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'comments'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <MessageSquare className="w-4 h-4 inline mr-1" />
            Comments ({comments.length})
          </button>
          <button
            onClick={() => setActiveTab('attachments')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'attachments'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Paperclip className="w-4 h-4 inline mr-1" />
            Files ({attachments.length})
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'links'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Link className="w-4 h-4 inline mr-1" />
            Links ({links.length})
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {isEditing ? (
                <form onSubmit={handleUpdate}>
                  <div className="space-y-4">
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Title *
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                        disabled={user?.role === 'employee'}
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={formData.description || ''}
                        onChange={handleInputChange}
                        rows={6}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        disabled={user?.role === 'employee'}
                      />
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Priority *
                      </label>
                      <select
                        name="priority"
                        value={formData.priority}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                        disabled={user?.role === 'employee'}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>

                    {/* Status - Only visible to admins */}
                    {user?.role !== 'employee' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Status *
                        </label>
                        <select
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          required
                        >
                          <option value="todo">To Do</option>
                          <option value="in-progress">In Progress</option>
                          <option value="on-hold">On Hold</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    )}

                    {/* Due Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Due Date
                      </label>
                      <input
                        type="date"
                        name="due_date"
                        value={formData.due_date}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        disabled={user?.role === 'employee'}
                      />
                    </div>

                    {/* Progress Slider - Only for assigned employees */}
                    {(user?.role === 'employee' && user?.id === task.assigned_to_id) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Percent className="w-4 h-4" />
                            Progress
                          </span>
                          <span className="text-lg font-bold text-red-600">{formData.progress || 0}%</span>
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={formData.progress || 0}
                          onChange={(e) => handleProgressChange(parseInt(e.target.value))}
                          className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, #DC2626 0%, #DC2626 ${formData.progress || 0}%, #E5E7EB ${formData.progress || 0}%, #E5E7EB 100%)`
                          }}
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>0%</span>
                          <span>25%</span>
                          <span>50%</span>
                          <span>75%</span>
                          <span>100%</span>
                        </div>
                        {/* Status indicator showing automatic change */}
                        <div className="mt-2 text-xs text-gray-600 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full font-medium ${
                              formData.status === 'completed' ? 'bg-green-100 text-green-800' :
                              formData.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                              formData.status === 'todo' ? 'bg-gray-100 text-gray-800' :
                              formData.status === 'on-hold' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {formData.status === 'in-progress' ? 'In Progress' : 
                               formData.status.charAt(0).toUpperCase() + formData.status.slice(1)}
                            </span>
                            <span className="text-gray-400">
                              {formData.progress === 0 ? '(Start working to begin)' :
                               formData.progress === 100 ? '(Task completed!)' :
                               '(Working on it)'}
                            </span>
                          </div>
                          {/* Quick update button for employees if progress changed */}
                          {user?.role === 'employee' && (formData.progress !== task.progress || formData.status !== task.status) && (
                            <button
                              type="button"
                              onClick={handleQuickProgressUpdate}
                              className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors flex items-center gap-1"
                            >
                              <Save className="w-3 h-3" />
                              Update Now
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons - Only for admins */}
                    {user?.role !== 'employee' && (
                      <div className="flex gap-3 pt-4">
                        <button
                          type="submit"
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Save className="w-4 h-4" />
                          Save Changes
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  {/* Title */}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{task.title}</h2>
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(task.status)}`}>
                        {task.status?.replace('-', ' ').toUpperCase()}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(task.priority)}`}>
                        {task.priority?.toUpperCase()} PRIORITY
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Description
                    </h3>
                    <p className="text-gray-900 whitespace-pre-wrap">
                      {task.description || 'No description provided'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Employee Progress Update Card */}
            {!isEditing && user?.role === 'employee' && user?.id === task.assigned_to_id && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-sm border-2 border-blue-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Percent className="w-5 h-5 text-blue-600" />
                    Update Progress
                  </h3>
                  <span className="text-2xl font-bold text-blue-600">{formData.progress || 0}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.progress || 0}
                  onChange={(e) => handleProgressChange(parseInt(e.target.value))}
                  className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer mb-2"
                  style={{
                    background: `linear-gradient(to right, #2563EB 0%, #2563EB ${formData.progress || 0}%, #E5E7EB ${formData.progress || 0}%, #E5E7EB 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-gray-500 mb-3">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
                <div className="mb-3">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-semibold inline-block ${
                    formData.status === 'completed' ? 'bg-green-100 text-green-800' :
                    formData.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                    formData.status === 'todo' ? 'bg-gray-100 text-gray-800' :
                    formData.status === 'on-hold' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    Status: {formData.status === 'in-progress' ? 'In Progress' : 
                             formData.status.charAt(0).toUpperCase() + formData.status.slice(1)}
                  </span>
                </div>
                {(formData.progress !== task.progress || formData.status !== task.status) && (
                  <button
                    onClick={handleQuickProgressUpdate}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    Save Progress
                  </button>
                )}
              </div>
            )}
            
            {/* Task Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Task Information</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Due Date</p>
                    <p className="font-medium text-gray-900">
                      {task.due_date ? format(new Date(task.due_date), 'MMM dd, yyyy') : 'Not set'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Created</p>
                    <p className="font-medium text-gray-900">
                      {format(new Date(task.created_at), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Created By</p>
                    <p className="font-medium text-gray-900">
                      {task.created_by?.name || task.creator_name || task.created_by_name || 'Unknown'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Assigned To</p>
                    <p className="font-medium text-gray-900">
                      {task.assigned_to?.name || task.assignee_name || task.assigned_to_name || 'Unassigned'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Department</p>
                    <p className="font-medium text-gray-900">
                      {task.department_name || task.department || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Percent className="w-4 h-4" />
                      Progress
                    </p>
                    <p className="text-lg font-bold text-red-600">{task.progress || 0}%</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-red-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${task.progress || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comments Tab */}
      {activeTab === 'comments' && (
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
              Comments
            </h3>
            {comments.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-full shadow-sm">
                  {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
                </span>
              </div>
            )}
          </div>
          
          {/* Comments List */}
          {comments.length === 0 ? (
            <div className="text-center py-16 mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full mb-4">
                <MessageSquare className="w-10 h-10 text-blue-600" />
              </div>
              <p className="text-gray-600 font-semibold text-lg mb-1">No comments yet</p>
              <p className="text-sm text-gray-400">Be the first to share your thoughts!</p>
            </div>
          ) : (
            <div className="mb-8 max-h-[600px] overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {comments.map((comment) => (
                <CommentThread
                  key={comment.id}
                  comment={comment}
                  onReply={handleReply}
                  onEdit={handleEditComment}
                  onDelete={handleDeleteComment}
                  participants={participants}
                />
              ))}
            </div>
          )}

          {/* Add Comment */}
          <div className="border-t border-gray-200 pt-6 mt-4">
            <div className="flex items-center gap-3 mb-4">
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt={user.name} className="w-10 h-10 rounded-full ring-2 ring-blue-200" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold shadow-md ring-2 ring-blue-200">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h4 className="font-semibold text-gray-800">Add your comment</h4>
                <p className="text-xs text-gray-500">Share your thoughts or ask a question</p>
              </div>
            </div>
            <CommentInput
              value={newComment}
              onChange={setNewComment}
              onSubmit={handleAddComment}
              participants={participants}
              replyingTo={replyingTo}
              onCancelReply={cancelReply}
              placeholder={replyingTo ? `Reply to ${replyingTo.name}...` : "Write a comment... (use @ to mention someone)"}
            />
          </div>
        </div>
      )}

      {/* Attachments Tab */}
      {activeTab === 'attachments' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Header Section */}
          <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                  <Paperclip className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Files & Attachments</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Upload and manage task-related documents and files
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.webp,.csv"
                />
                <label
                  htmlFor="file-upload"
                  className={`flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md font-medium ${
                    uploadingFile ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  {uploadingFile ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      <span>Upload File</span>
                    </>
                  )}
                </label>
              </div>
            </div>

          </div>

          {/* Content Section */}
          <div className="p-6">
            {attachments.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-4">
                  <Paperclip className="w-12 h-12 text-gray-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">No files uploaded yet</h4>
                <p className="text-gray-500 mb-4">Upload documents, images, or other files to share with your team</p>
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer font-medium"
                >
                  <Upload className="w-5 h-5" />
                  Upload Your First File
                </label>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold text-gray-900">{attachments.length}</span> file{attachments.length !== 1 ? 's' : ''} attached
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {attachments.map((attachment) => (
                    <div 
                      key={attachment.id} 
                      className="group border-2 border-gray-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-white to-gray-50"
                    >
                      {/* File Icon and Actions */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                          <Paperclip className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDownloadAttachment(attachment)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shadow-sm hover:shadow"
                            title="Download file"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          {(user?.role === 'super_admin' || 
                            user?.role === 'dept_admin' || 
                            attachment.uploaded_by === user?.id ||
                            task?.created_by_id === user?.id) && (
                            <button
                              onClick={() => handleDeleteAttachment(attachment.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors shadow-sm hover:shadow"
                              title="Delete file"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* File Details */}
                      <div className="space-y-2">
                        <h4 
                          className="font-semibold text-gray-900 truncate text-sm group-hover:text-blue-600 transition-colors" 
                          title={attachment.file_name}
                        >
                          {attachment.file_name}
                        </h4>
                        
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1 text-gray-500">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                            <span className="font-medium">
                              {attachment.file_size ? `${(attachment.file_size / 1024).toFixed(1)} KB` : 'Unknown'}
                            </span>
                          </div>
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                            Uploaded
                          </span>
                        </div>

                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-500">
                            {attachment.created_at ? format(new Date(attachment.created_at), 'MMM dd, yyyy • HH:mm') : 'Unknown date'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Links Tab */}
      {activeTab === 'links' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Header Section */}
          <div className="border-b border-gray-200 bg-gradient-to-r from-green-50 to-teal-50 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center shadow-sm">
                  <Link className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Task Links</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Useful links and resources for this task
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddLinkModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-sm hover:shadow-md font-medium"
              >
                <Plus className="w-5 h-5" />
                Add Link
              </button>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-6">
            {links.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-4">
                  <Link className="w-12 h-12 text-gray-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">No links added yet</h4>
                <p className="text-gray-500 mb-4">Add useful links and resources related to this task</p>
                <button
                  onClick={() => setShowAddLinkModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Add Your First Link
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold text-gray-900">{links.length}</span> link{links.length !== 1 ? 's' : ''} added
                  </p>
                </div>
                <div className="space-y-3">
                  {links.map((link) => (
                    <div 
                      key={link.id} 
                      className="group border-2 border-gray-200 rounded-xl p-4 hover:border-green-400 hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-white to-gray-50"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                              <ExternalLink className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-gray-900 hover:text-green-600 transition-colors block truncate"
                                title={link.title}
                              >
                                {link.title}
                              </a>
                              <p className="text-xs text-gray-500 truncate mt-1" title={link.url}>
                                {link.url}
                              </p>
                              {link.description && (
                                <p className="text-sm text-gray-600 mt-2">
                                  {link.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                <span>Added by {link.added_by_name}</span>
                                <span>•</span>
                                <span>{link.created_at ? format(new Date(link.created_at), 'MMM dd, yyyy') : 'Unknown date'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {(user?.role === 'super_admin' || 
                            user?.role === 'dept_admin' || 
                            link.added_by === user?.id) && (
                            <>
                              <button
                                onClick={() => handleEditLink(link)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shadow-sm hover:shadow"
                                title="Edit link"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteLink(link.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors shadow-sm hover:shadow"
                                title="Delete link"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Work Logs Tab */}
      {activeTab === 'worklogs' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Daily Work Logs</h3>
            {/* Only task assignee can log work - dept_admin and super_admin can only view */}
            {task?.assigned_to_id === user?.id && (
              <button
                onClick={() => setShowWorkLogModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Log Work
              </button>
            )}
          </div>

          {/* Work Logs Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{workLogs.length}</div>
              <div className="text-xs text-blue-700">Total Logs</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {workLogs.reduce((sum, log) => sum + (parseFloat(log.hours_worked) || 0), 0).toFixed(1)}h
              </div>
              <div className="text-xs text-green-700">Total Hours</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{task?.progress || 0}%</div>
              <div className="text-xs text-purple-700">Progress</div>
            </div>
          </div>

          {/* Work Logs List */}
          {workLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <ClipboardList className="w-12 h-12 mb-2" />
              <p>No work logs yet</p>
              {(task?.assigned_to_id === user?.id) && (
                <p className="text-sm">Click "Log Work" to add your first entry</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {workLogs.map(log => (
                <div key={log.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(log.work_date), 'MMM dd, yyyy')}</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        log.status === 'completed' ? 'bg-green-100 text-green-800' :
                        log.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        log.status === 'blocked' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {log.status?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap mb-3">{log.description}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    {log.hours_worked && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{log.hours_worked}h worked</span>
                      </div>
                    )}
                    {log.progress_percentage !== null && (
                      <div className="flex items-center gap-1">
                        <Percent className="w-4 h-4" />
                        <span>{log.progress_percentage}% progress</span>
                      </div>
                    )}
                  </div>
                  {log.blockers && (
                    <div className="mt-3 p-2 bg-red-50 rounded-lg">
                      <div className="flex items-center gap-2 text-red-700 text-sm font-medium mb-1">
                        <AlertCircle className="w-4 h-4" />
                        Blockers
                      </div>
                      <p className="text-red-600 text-sm">{log.blockers}</p>
                    </div>
                  )}
                  <div className="mt-3 text-xs text-gray-400">
                    Logged by {log.user?.name || 'Unknown'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Work Log Modal */}
      {showWorkLogModal && task && (
        <DailyWorkLog
          task={task}
          onClose={() => setShowWorkLogModal(false)}
          onUpdate={() => {
            setShowWorkLogModal(false);
            fetchTaskDetails();
          }}
        />
      )}
    </div>
  );
};

export default TaskDetails;
