import { useState, useEffect } from 'react';
import { UserPlus, Eye, EyeOff, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { authAPI, departmentAPI } from '../services/api';
import useAuthStore from '../store/authStore';

export default function CreateEmployee() {
  const { user } = useAuthStore();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdEmployee, setCreatedEmployee] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    department: '',
    role: 'employee',
    phone: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchDepartments();
    generatePassword();
  }, []);

  // Auto-set department for dept admins when departments are loaded
  useEffect(() => {
    console.log('useEffect triggered');
    console.log('user role:', user?.role);
    console.log('departments length:', departments.length);
    console.log('formData.department:', formData.department);
    
    if (user?.role === 'dept_admin' && departments.length > 0) {
      console.log('Auto-setting department for dept admin');
      console.log('Departments:', departments);
      console.log('First department:', departments[0]);
      console.log('Department name:', departments[0]?.name);
      
      // Only set if not already set or if it's empty
      if (!formData.department || formData.department === '') {
        console.log('Setting department to:', departments[0].name);
        setFormData(prev => ({ ...prev, department: departments[0].name }));
      }
    }
  }, [departments, user, formData.department]);

  const fetchDepartments = async () => {
    try {
      const response = await departmentAPI.getAllDepartments();
      let availableDepartments = response.data || [];
      
      // Filter departments for dept admins
      if (user?.role === 'dept_admin') {
        const managedDeptIds = user.managed_department_ids || [];
        availableDepartments = availableDepartments.filter(dept => 
          managedDeptIds.includes(dept.id)
        );
      }
      
      setDepartments(availableDepartments);
    } catch (error) {
      console.error('Error fetching departments:', error);
      setErrors({ department: 'Failed to load departments' });
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedPassword(password);
    setFormData(prev => ({ ...prev, password }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (!/^[a-zA-Z\s\-\.]+$/.test(formData.name.trim())) {
      newErrors.name = 'Name can only contain letters, spaces, hyphens, and periods';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.department) {
      newErrors.department = 'Department selection is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    if (formData.phone && !/^[\+]?[\d\s\-\(\)]{7,20}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Ensure department is set for dept admins
      const submitData = { ...formData };
      if (user?.role === 'dept_admin' && departments.length > 0 && !submitData.department) {
        submitData.department = departments[0].name;
      }
      
      const response = await authAPI.adminCreateEmployee(submitData);
      
      if (response.data.success) {
        setCreatedEmployee({
          name: formData.name,
          email: formData.email,
          username: response.data.data.username,
          department: formData.department,
          role: formData.role,
          password: generatedPassword
        });
        setShowSuccess(true);
        
        // Reset form
        setFormData({
          name: '',
          username: '',
          email: '',
          password: '',
          department: '',
          role: 'employee',
          phone: ''
        });
        generatePassword();
        setErrors({});
      }
    } catch (error) {
      console.error('Error creating employee:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create employee account';
      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-black">Create Employee Account</h1>
          <p className="text-gray-600 mt-1">Create immediate active employee accounts with system access</p>
        </div>
        <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg">
          <span className="font-semibold">Admin-Initiated</span> Registration
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">Admin-Initiated Registration</h3>
            <p className="text-sm text-blue-700 mt-1">
              Accounts created here are immediately active and ready for use. The employee will receive 
              their login credentials and can access the system right away. No approval process required.
            </p>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccess && createdEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-black">Employee Created Successfully!</h2>
              <p className="text-gray-600 mt-1">Account is active and ready for use</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
              <h3 className="font-medium text-gray-900">Account Details:</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600">Name:</div>
                <div className="font-medium">{createdEmployee.name}</div>
                <div className="text-gray-600">Email:</div>
                <div className="font-medium">{createdEmployee.email}</div>
                <div className="text-gray-600">Username:</div>
                <div className="font-medium">{createdEmployee.username}</div>
                <div className="text-gray-600">Department:</div>
                <div className="font-medium">{createdEmployee.department}</div>
                <div className="text-gray-600">Role:</div>
                <div className="font-medium">{createdEmployee.role}</div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-yellow-900 mb-2">Generated Login Credentials:</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-white rounded border p-2">
                  <span className="text-sm">Email: {createdEmployee.email}</span>
                  <button
                    onClick={() => copyToClipboard(createdEmployee.email)}
                    className="text-blue-600 hover:text-blue-800 text-xs"
                  >
                    Copy
                  </button>
                </div>
                <div className="flex items-center justify-between bg-white rounded border p-2">
                  <span className="text-sm font-mono">Password: {createdEmployee.password}</span>
                  <button
                    onClick={() => copyToClipboard(createdEmployee.password)}
                    className="text-blue-600 hover:text-blue-800 text-xs"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <p className="text-xs text-yellow-700 mt-2">
                ⚠️ Make sure to securely share these credentials with the employee. They should change their password after first login.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSuccess(false);
                  setCreatedEmployee(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowSuccess(false);
                  setCreatedEmployee(null);
                  // Could add logic to create another employee
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Another
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{errors.submit}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter employee's full name"
                />
                {errors.name && (
                  <p className="text-red-600 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    errors.username ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter username for login"
                />
                {errors.username && (
                  <p className="text-red-600 text-sm mt-1">{errors.username}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="employee@company.com"
                />
                {errors.email && (
                  <p className="text-red-600 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="+1 (555) 123-4567"
                />
                {errors.phone && (
                  <p className="text-red-600 text-sm mt-1">{errors.phone}</p>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department <span className="text-red-600">*</span>
                </label>
                <select
                  name="department"
                  value={user?.role === 'dept_admin' && departments.length > 0 && !formData.department 
                    ? departments[0].name 
                    : formData.department}
                  onChange={handleChange}
                  disabled={user?.role === 'dept_admin'}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    errors.department ? 'border-red-500' : 'border-gray-300'
                  } ${user?.role === 'dept_admin' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                {errors.department && (
                  <p className="text-red-600 text-sm mt-1">{errors.department}</p>
                )}
                {user?.role === 'dept_admin' && (
                  <p className="text-blue-600 text-xs mt-1">
                    This is your managed department and cannot be changed
                  </p>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role <span className="text-red-600">*</span>
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="employee">Employee</option>
                  {user?.role === 'super_admin' && <option value="dept_admin">Department Admin</option>}
                  {user?.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
                </select>
                {user?.role === 'dept_admin' && (
                  <p className="text-gray-600 text-xs mt-1">
                    Department admins can only create regular employees
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Generated Password <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 pr-20 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-mono ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    readOnly
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-3">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-500 hover:text-gray-700"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="text-gray-500 hover:text-gray-700"
                      title="Generate new password"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {errors.password && (
                  <p className="text-red-600 text-sm mt-1">{errors.password}</p>
                )}
                <p className="text-gray-600 text-xs mt-1">
                  A secure password has been generated. Click refresh to generate a new one.
                </p>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setFormData({
                  name: '',
                  username: '',
                  email: '',
                  password: '',
                  department: '',
                  role: 'employee',
                  phone: ''
                });
                generatePassword();
                setErrors({});
              }}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Reset Form
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Employee Account
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}