import React from 'react';

const HostDashboardSettingsTab = ({
  hostSettings,
  updateHostSettingField,
  updateNotificationPreference,
  handleSaveSettings,
  isSavingSettings,
  settingsDirty,
  settingsValidationError,
}) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        {settingsDirty && !settingsValidationError ? (
          <p className="text-xs text-amber-700 mt-1">You have unsaved changes.</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={handleSaveSettings}
        disabled={isSavingSettings || !settingsDirty || Boolean(settingsValidationError)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
      >
        {isSavingSettings ? 'Saving...' : 'Save Changes'}
      </button>
    </div>

    {settingsValidationError ? (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
        {settingsValidationError}
      </div>
    ) : null}

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
            <input
              type="text"
              value={hostSettings.company_name}
              onChange={(event) => updateHostSettingField('company_name', event.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Your hotel business name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
            <input
              type="email"
              value={hostSettings.email}
              readOnly
              className="w-full border border-gray-200 bg-gray-50 text-gray-500 rounded-lg px-3 py-2"
              placeholder="contact@yourhotel.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={hostSettings.phone_number}
              onChange={(event) => updateHostSettingField('phone_number', event.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="+254 700 000 000"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Language</label>
              <select
                value={hostSettings.preferred_language}
                onChange={(event) => updateHostSettingField('preferred_language', event.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="en">English</option>
                <option value="sw">Swahili</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Currency</label>
              <select
                value={hostSettings.preferred_currency}
                onChange={(event) => updateHostSettingField('preferred_currency', event.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="KES">KES</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600"
              checked={Boolean(hostSettings.notification_preferences?.new_booking_notifications)}
              onChange={(event) => updateNotificationPreference('new_booking_notifications', event.target.checked)}
            />
            <span className="ml-2 text-sm text-gray-700">New booking notifications</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600"
              checked={Boolean(hostSettings.notification_preferences?.review_notifications)}
              onChange={(event) => updateNotificationPreference('review_notifications', event.target.checked)}
            />
            <span className="ml-2 text-sm text-gray-700">Review notifications</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600"
              checked={Boolean(hostSettings.notification_preferences?.marketing_emails)}
              onChange={(event) => updateNotificationPreference('marketing_emails', event.target.checked)}
            />
            <span className="ml-2 text-sm text-gray-700">Marketing emails</span>
          </label>
        </div>
      </div>
    </div>
  </div>
);

export default HostDashboardSettingsTab;
