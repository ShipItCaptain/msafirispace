import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HostOnboardingWizard from '../components/onboarding/HostOnboardingWizard';
import { authAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const BecomeHostPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const routeReturningHost = async () => {
      if (!isAuthenticated) {
        // Steps 1-2 of the wizard are browsable logged out (same as the old
        // picker page was) -- only submitting KYC data requires an account.
        setChecking(false);
        return;
      }

      try {
        const status = await authAPI.getHostOnboardingStatus();
        if (!status.onboarding_completed) {
          if (!cancelled) setChecking(false);
          return;
        }

        // Already onboarded -- skip straight past Steps 1-3. Check whether
        // they already have a listing of their category to decide between
        // their dashboard (returning host) or the facility form (KYC done,
        // first listing not made yet).
        if (status.host_category === 'hotel_restaurant') {
          const { listingsAPI } = await import('../services/api');
          const hotelsResponse = await listingsAPI.getUserListings();
          const hotels = hotelsResponse?.results || hotelsResponse || [];
          // The wizard normally creates the hotel in the same submission as
          // onboarding, so "onboarded with zero hotels" shouldn't happen for
          // new hosts -- /list-hotel stays here only as a recovery path for
          // that edge case (e.g. onboarding succeeded but hotel creation
          // failed mid-flow, or a pre-existing account from before this
          // change).
          navigate(hotels.length > 0 ? '/host-dashboard' : '/list-hotel', { replace: true });
        } else {
          const { bnbAPI } = await import('../services/api');
          const myBnB = await bnbAPI.getMyListings();
          const bnbList = myBnB?.results || myBnB || [];
          navigate(bnbList.length > 0 ? '/host/bnb' : '/become-host/bnb', { replace: true });
        }
      } catch (error) {
        console.error('Error checking host onboarding status:', error);
        if (!cancelled) setChecking(false);
      }
    };

    routeReturningHost();
    return () => { cancelled = true; };
  }, [isAuthenticated, navigate]);

  const handleOnboardingComplete = (hostCategory) => {
    // The wizard itself creates the Hotel (name, location, photos) as part
    // of its own Finish step now, so there's no separate facility form left
    // to fill out -- go straight to the hotel dashboard. BnB still lands on
    // its facility form, since BnB hosts can list multiple units and that
    // form is how each additional one gets added.
    navigate(hostCategory === 'hotel_restaurant' ? '/host/hotels' : '/become-host/bnb', { replace: true });
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-14 lg:pt-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" />
      </div>
    );
  }

  return <HostOnboardingWizard onComplete={handleOnboardingComplete} />;
};

export default BecomeHostPage;
