import React from 'react';

const CookiePolicyPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-2">Cookie Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: October 23, 2026</p>
        <div className="bg-white rounded-lg shadow p-6 sm:p-8 prose prose-gray max-w-none">
          <p>
            Cookies are small files stored in your browser. We use them to keep the site
            working and to understand how it's used.
          </p>

          <h2>Essential cookies</h2>
          <p>
            Used to keep you signed in and remember your session. The site can't
            function without these, so they're always on.
          </p>

          <h2>Analytics cookies</h2>
          <p>
            Used to understand aggregate usage (pages visited, general traffic trends) so
            we can improve the product. You can opt out of these from the cookie banner
            shown on your first visit.
          </p>

          <h2>Managing cookies</h2>
          <p>
            Most browsers let you block or delete cookies in their settings. Blocking
            essential cookies will prevent you from staying signed in.
          </p>

          <h2>Contact</h2>
          <p>Questions? Reach us at privacy@msafirispace.com.</p>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicyPage;
