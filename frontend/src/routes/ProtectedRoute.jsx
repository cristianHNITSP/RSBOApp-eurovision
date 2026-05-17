import { Navigate } from 'react-router-dom';

const isAuthenticated = () => {
  return sessionStorage.getItem('rsbo_auth') === 'true';
};

const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  return children;
};

export default ProtectedRoute;
