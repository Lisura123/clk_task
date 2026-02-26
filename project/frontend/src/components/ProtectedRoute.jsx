import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function ProtectedRoute({ children, allowedRoles = [], allowHR = false, requireHROrAdmin = false }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user is from HR department (ID 12)
  const isHRUser = (user?.department_name?.toLowerCase() === 'hr') || 
                   (user?.department?.toLowerCase() === 'hr') ||
                   (user?.department_id == 12) ||
                   (user?.departmentRelation?.name?.toLowerCase() === 'hr');

  const isAdmin = user?.role === 'admin';

  // If requireHROrAdmin is true, only allow admin or HR users
  if (requireHROrAdmin) {
    if (!isAdmin && !isHRUser) {
      return <Navigate to="/dashboard" replace />;
    }
    return children;
  }

  // If allowHR is true, allow HR users regardless of role
  if (allowHR && isHRUser) {
    return children;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
