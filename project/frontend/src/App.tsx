import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import DeptAdminDashboard from './pages/DeptAdminDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import Tasks from './pages/Tasks';
import MyTasks from './pages/MyTasks';
import Users from './pages/Users';
import CreateEmployee from './pages/CreateEmployee';
import PendingRegistrations from './pages/PendingRegistrations';
import Departments from './pages/Departments';
import Groups from './pages/Groups';
import Settings from './pages/Settings';
import Search from './pages/Search';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import TaskDetails from './pages/TaskDetails';
import useAuthStore from './store/authStore';

function DashboardRouter() {
  const { user } = useAuthStore();

  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'super_admin':
      return <SuperAdminDashboard />;
    case 'dept_admin':
      return <DeptAdminDashboard />;
    case 'employee':
      return <EmployeeDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          
          {/* Dashboard Route - dynamically renders based on role */}
          <Route path="dashboard" element={<DashboardRouter />} />

          {/* Dashboard Task Routes */}
          <Route
            path="dashboard/tasks"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'dept_admin', 'employee']}>
                <Tasks />
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard/tasks/:id"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'dept_admin', 'employee']}>
                <TaskDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard/my-tasks"
            element={
              <ProtectedRoute allowedRoles={['employee']}>
                <MyTasks />
              </ProtectedRoute>
            }
          />

          {/* Dashboard User Management */}
          <Route
            path="dashboard/users"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'dept_admin']}>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard/create-employee"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <CreateEmployee />
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard/pending-registrations"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <PendingRegistrations />
              </ProtectedRoute>
            }
          />

          {/* Dashboard Department Management */}
          <Route
            path="dashboard/departments"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <Departments />
              </ProtectedRoute>
            }
          />

          {/* Dashboard Group Management */}
          <Route
            path="dashboard/groups"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'dept_admin']}>
                <Groups />
              </ProtectedRoute>
            }
          />

          {/* Dashboard Search */}
          <Route
            path="dashboard/search"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'dept_admin', 'employee']}>
                <Search />
              </ProtectedRoute>
            }
          />

          {/* Dashboard Notifications */}
          <Route
            path="dashboard/notifications"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'dept_admin', 'employee']}>
                <Notifications />
              </ProtectedRoute>
            }
          />

          {/* Dashboard Profile */}
          <Route
            path="dashboard/profile"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'dept_admin', 'employee']}>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Dashboard Settings */}
          <Route path="dashboard/settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
