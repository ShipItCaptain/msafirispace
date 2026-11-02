import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

// Gates /admin/* routes. Deliberately a sibling to RoleGuard, not an
// extension of it: this checks a single-value field (admin_tier), not
// array-membership in `roles`, and on denial it always redirects silently
// -- the admin UI's "hide what a tier can't do" rule means a tier below a
// route's requirement should never see an access-denied page either.
const AdminRoleGuard = ({ children, allowedTiers = [], fallbackPath = '/admin/login' }) => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} replace />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user.admin_tier || (allowedTiers.length > 0 && !allowedTiers.includes(user.admin_tier))) {
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
};

export default AdminRoleGuard;
