import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from '../../store/slices/authSlice';

const ProtectedRoute = ({ children, isAuthenticated: propIsAuthenticated }) => {
  const reduxIsAuthenticated = useSelector(selectIsAuthenticated);
  const location = useLocation();
  
  // Use prop if provided, otherwise use Redux state
  const isAuthenticated = propIsAuthenticated !== undefined ? propIsAuthenticated : reduxIsAuthenticated;

  if (!isAuthenticated) {
    // Redirect to login page with the return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
