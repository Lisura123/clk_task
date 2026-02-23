import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function ProtectedRoute({ children, allowedRoles = [], allowProcurement = false }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user is from Procurement department
  const isProcurementUser = (user?.department_name?.toLowerCase()?.includes('procurement')) || 
                            (user?.department?.toLowerCase()?.includes('procurement')) ||
                            (user?.department_id == 8) ||
                            (user?.departmentRelation?.name?.toLowerCase()?.includes('procurement'));

  // If allowProcurement is true, allow procurement users regardless of role
  if (allowProcurement && isProcurementUser) {
    return children;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
