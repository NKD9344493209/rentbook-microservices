import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/* Client-side guard for convenience; the server checks roles too. */
export default function ProtectedRoute({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'owner' ? '/owner' : '/dashboard'} replace />;
  }
  return children;
}
