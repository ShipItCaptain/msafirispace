import React from 'react';

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-2">Terms &amp; Conditions</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: October 23, 2026</p>
        <div className="bg-white rounded-lg shadow p-6 sm:p-8 prose prose-gray max-w-none">
          <h2>1. The service</h2>
          <p>
            Msafiri Space is a marketplace that lets hosts list hotels, restaurants, and
            BnBs, and lets travelers discover and book them. We are not a party to the
            stay itself -- the contract for accommodation is between the guest and the
            host.
          </p>

          <h2>2. Accounts</h2>
          <p>
            You must provide accurate information when registering and keep your
            credentials secure. You're responsible for activity under your account.
            Hosts must provide truthful identity and business documentation during
            onboarding; listings found to be fraudulent or misrepresented may be removed.
          </p>

          <h2>3. Bookings and payments</h2>
          <p>
            Prices shown include the fees disclosed at checkout. Payments are processed
            through our third-party payment providers (Paystack, M-Pesa). A booking is
            confirmed once payment succeeds and the host accepts, subject to each
            listing's cancellation and hold policies shown at checkout.
          </p>

          <h2>4. Cancellations and refunds</h2>
          <p>
            Cancellation terms are set per listing and shown before you book. Refunds,
            where applicable, are issued to the original payment method and may take
            several business days to appear depending on the provider.
          </p>

          <h2>5. Host responsibilities</h2>
          <p>
            Hosts are responsible for the accuracy of their listings, the safety and
            legality of their property or establishment, and honoring confirmed
            bookings. Repeated cancellations or safety complaints may result in listing
            suspension.
          </p>

          <h2>6. Prohibited use</h2>
          <p>
            You may not use the platform to post fraudulent listings, circumvent
            payments, scrape the site, or interfere with its normal operation.
          </p>

          <h2>7. Liability</h2>
          <p>
            Msafiri Space is provided on an "as is" basis. We're not liable for the
            conduct of hosts or guests, or for the condition of a listed property, beyond
            what's required by applicable law.
          </p>

          <h2>8. Changes</h2>
          <p>
            We may update these terms from time to time; continued use of the platform
            after a change means you accept the updated terms.
          </p>

          <h2>Contact</h2>
          <p>Questions? Reach us at support@msafirispace.com.</p>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
