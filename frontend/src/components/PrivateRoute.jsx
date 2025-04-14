import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute({ children }) {
  const { currentUser } = useAuth();

  if (!currentUser) {
    // Redirect to login page if not authenticated
    return <Navigate to="/login" />;
  }

  return children;
} 