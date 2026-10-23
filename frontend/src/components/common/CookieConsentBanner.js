import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'cookie_consent';

const CookieConsentBanner = () => {
  const [dismissed, setDismissed] = useState(
    () => typeof window !== 'undefined' && !!localStorage.getItem(STORAGE_KEY)
  );

  if (dismissed) return null;

  const choose = (value) => {
    localStorage.setItem(STORAGE_KEY, value);
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-gray-900 text-white px-4 py-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm text-gray-200 flex-1">
          We use essential cookies to run this site and optional analytics cookies to
          improve it. See our{' '}
          <Link to="/cookies" className="underline hover:text-white">
            Cookie Policy
          </Link>
          .
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            type="button"
            onClick={() => choose('essential_only')}
            className="px-4 py-2 text-sm font-medium rounded-md border border-gray-500 hover:bg-gray-800"
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={() => choose('accepted')}
            className="px-4 py-2 text-sm font-medium rounded-md bg-red-500 hover:bg-red-600"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
