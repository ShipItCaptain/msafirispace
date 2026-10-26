import React from 'react';

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 pt-14 lg:pt-20 pb-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: October 23, 2026</p>
        <div className="bg-white rounded-lg shadow p-6 sm:p-8 prose prose-gray max-w-none">
          <p>
            Msafiri Space ("we", "us") operates a marketplace connecting travelers with
            hotels, restaurants, and BnB hosts. This policy explains what information we
            collect, why, and how it's handled.
          </p>

          <h2>Information we collect</h2>
          <ul>
            <li>Account details: name, email, phone number, password (stored hashed, never in plain text).</li>
            <li>Identity details for hosts: national ID, KRA PIN, business permits, and related documents, collected to verify listings during host onboarding.</li>
            <li>Booking details: stay dates, guest counts, special requests, and payment status.</li>
            <li>Payment information: processed by our payment providers (Paystack, M-Pesa); we store transaction references and status, not full card or mobile-money credentials.</li>
            <li>Usage data: pages visited and general device/browser information, used to keep the platform working and secure.</li>
          </ul>

          <h2>How we use it</h2>
          <ul>
            <li>To create and manage your account and bookings.</li>
            <li>To verify host identity and listing legitimacy.</li>
            <li>To process payments and send booking confirmations.</li>
            <li>To respond to support requests and prevent fraud or abuse.</li>
          </ul>

          <h2>Who we share it with</h2>
          <p>
            We share booking details with the host or guest on the other side of a
            booking as needed to fulfil it, and payment details with our payment
            processors (Paystack, Safaricom M-Pesa) to complete transactions. We do not
            sell personal data to third parties.
          </p>

          <h2>Cookies</h2>
          <p>
            We use essential cookies to keep you signed in and keep the site working.
            See our <a href="/cookies">Cookie Policy</a> for details and how to control them.
          </p>

          <h2>Data retention</h2>
          <p>
            We keep account and booking records for as long as your account is active
            and as needed to meet legal, tax, and dispute-resolution obligations
            afterward.
          </p>

          <h2>Your rights</h2>
          <p>
            You can request access to, correction of, or deletion of your personal data
            by contacting us. Deleting your account removes your profile information;
            booking records tied to completed transactions may be retained as required
            by law.
          </p>

          <h2>Contact</h2>
          <p>Questions about this policy? Reach us at privacy@msafirispace.com.</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
