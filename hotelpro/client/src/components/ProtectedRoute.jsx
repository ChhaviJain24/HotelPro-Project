import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
export default function ProtectedRoute({ roles, children }) {
  const { user, token } = useSelector((s) => s.auth);
  const loc = useLocation();
  if (!token || !user) return <Navigate to="/login" state={{ from: loc.pathname + loc.search }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
