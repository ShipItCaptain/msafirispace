import React, { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import GuestTripsPage from './guest/GuestTripsPage';

// Everything a logged-in user needs lives in one of two real, data-backed
// places: a host's own dashboard (hotel/BnB), or GuestTripsPage for
// everyone else. This component is just the router between them -- it used
// to also render its own guest/host tab UI inline, but that was all mock
// data (hardcoded stats, fake transactions, a fake phone number and
// profile) that nothing ever wired up to the real APIs, so it's gone.
const DashboardPage = () => {
  const { isBnBHost, isHotelRestaurantHost } = useAuth();
  const navigate = useNavigate();
  const isHost = Boolean(isBnBHost || isHotelRestaurantHost);
  const hostDashboardPath = isHotelRestaurantHost
    ? '/host-dashboard'
    : isBnBHost
      ? '/host/bnb'
      : '/host/home';

  useEffect(() => {
    if (!isHost) return;
    navigate(hostDashboardPath, { replace: true });
  }, [isHost, hostDashboardPath, navigate]);

  if (isHost) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 text-center max-w-lg">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-2">Redirecting to Host Dashboard</h1>
          <p className="text-sm text-gray-600 mb-4">
            Host accounts use dedicated dashboards. If you are not redirected automatically, use the button below.
          </p>
          <button
            onClick={() => navigate(hostDashboardPath)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Open Host Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <GuestTripsPage />;
};

export default DashboardPage;
