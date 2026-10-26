import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  CameraIcon,
  CheckBadgeIcon,
  ChevronRightIcon,
  KeyIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { authAPI, getApiErrorDetails } from '../services/api';

const SECTIONS = [
  { id: 'personal', label: 'Personal info' },
  { id: 'login', label: 'Login & security' },
  { id: 'preferences', label: 'Preferences' },
];

const GENDER_OPTIONS = [
  { value: '', label: 'Prefer not to say' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'sw', label: 'Kiswahili' },
];

const CURRENCY_OPTIONS = [
  { value: 'KES', label: 'Kenyan Shilling (KES)' },
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
];

const emptyPersonal = {
  first_name: '',
  last_name: '',
  phone_number: '',
  date_of_birth: '',
  gender: '',
  bio: '',
  location: '',
  city: '',
  country: '',
};

const FieldRow = ({ label, value, hint, onEdit, editing, children }) => (
  <div className="py-5 border-b border-gray-200 last:border-b-0">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        {!editing && (
          <>
            <p className="mt-1 text-sm text-gray-700 break-words">
              {value || <span className="text-gray-500">Not provided</span>}
            </p>
            {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
          </>
        )}
        {editing && <div className="mt-3">{children}</div>}
      </div>
      {onEdit && !editing && (
        <button
          type="button"
          onClick={onEdit}
          className="text-sm font-semibold text-gray-900 underline underline-offset-2 hover:text-red-600 flex-shrink-0"
        >
          Edit
        </button>
      )}
    </div>
  </div>
);

const EditActions = ({ onCancel, onSave, saving, saveLabel = 'Save' }) => (
  <div className="flex flex-wrap gap-2 mt-4">
    <button
      type="button"
      onClick={onSave}
      disabled={saving}
      className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60"
    >
      {saving ? 'Saving…' : saveLabel}
    </button>
    <button
      type="button"
      onClick={onCancel}
      disabled={saving}
      className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-60"
    >
      Cancel
    </button>
  </div>
);

const inputClass =
  'w-full border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600';

const ProfilePage = () => {
  const { user, getMe, logout } = useAuth();
  const fileInputRef = useRef(null);

  const [section, setSection] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [personalForm, setPersonalForm] = useState(emptyPersonal);
  const [preferencesForm, setPreferencesForm] = useState({
    preferred_language: 'en',
    preferred_currency: 'KES',
  });
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    new_password_confirm: '',
  });

  const syncFromDetail = (data) => {
    setDetail(data);
    setPersonalForm({
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      phone_number: data.phone_number || '',
      date_of_birth: data.date_of_birth || '',
      gender: data.gender || '',
      bio: data.bio || '',
      location: data.location || '',
      city: data.city || '',
      country: data.country || '',
    });
    setPreferencesForm({
      preferred_language: data.preferred_language || 'en',
      preferred_currency: data.preferred_currency || 'KES',
    });
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const data = await authAPI.getUserDetail();
        if (!cancelled) syncFromDetail(data);
      } catch (err) {
        if (!cancelled) {
          toast.error(getApiErrorDetails(err, 'Failed to load profile').message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshUser = async (nextDetail) => {
    if (nextDetail) syncFromDetail(nextDetail);
    try {
      await getMe();
    } catch {
      // non-blocking — detail already saved
    }
  };

  const saveFields = async (payload) => {
    try {
      setSaving(true);
      const response = await authAPI.updateUserDetail(payload);
      const next = response.user || response;
      await refreshUser(next);
      setEditingField(null);
      toast.success('Saved');
    } catch (err) {
      toast.error(getApiErrorDetails(err, 'Could not save changes').message);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB');
      return;
    }

    try {
      setUploadingPhoto(true);
      const formData = new FormData();
      formData.append('profile_picture', file);
      const response = await authAPI.updateUserDetail(formData);
      const next = response.user || response;
      await refreshUser(next);
      toast.success('Photo updated');
    } catch (err) {
      toast.error(getApiErrorDetails(err, 'Could not upload photo').message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePasswordSave = async () => {
    if (passwordForm.new_password.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (passwordForm.new_password !== passwordForm.new_password_confirm) {
      toast.error('New passwords do not match');
      return;
    }
    try {
      setSaving(true);
      await authAPI.changePassword(passwordForm);
      setPasswordForm({ old_password: '', new_password: '', new_password_confirm: '' });
      setEditingField(null);
      toast.success('Password updated');
    } catch (err) {
      toast.error(getApiErrorDetails(err, 'Could not change password').message);
    } finally {
      setSaving(false);
    }
  };

  const displayName =
    [detail?.first_name, detail?.last_name].filter(Boolean).join(' ') ||
    user?.first_name ||
    'Your account';
  const photoUrl = detail?.profile_picture || user?.profile_picture || null;
  const memberSince = detail?.created_at
    ? new Date(detail.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : null;
  const genderLabel =
    GENDER_OPTIONS.find((opt) => opt.value === (detail?.gender || ''))?.label || detail?.gender;
  const placeLine = [detail?.city || detail?.location, detail?.country].filter(Boolean).join(', ');

  const renderPersonal = () => (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Personal info</h2>
      <p className="text-sm text-gray-500 mb-6">
        Details hosts and Msafiri use to know you — keep them accurate.
      </p>

      <FieldRow
        label="Legal name"
        value={displayName !== 'Your account' ? displayName : null}
        editing={editingField === 'name'}
        onEdit={() => setEditingField('name')}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">First name</label>
            <input
              className={inputClass}
              value={personalForm.first_name}
              onChange={(e) => setPersonalForm((f) => ({ ...f, first_name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Last name</label>
            <input
              className={inputClass}
              value={personalForm.last_name}
              onChange={(e) => setPersonalForm((f) => ({ ...f, last_name: e.target.value }))}
            />
          </div>
        </div>
        <EditActions
          saving={saving}
          onCancel={() => {
            setEditingField(null);
            syncFromDetail(detail);
          }}
          onSave={() =>
            saveFields({
              first_name: personalForm.first_name.trim(),
              last_name: personalForm.last_name.trim(),
            })
          }
        />
      </FieldRow>

      <FieldRow
        label="Phone number"
        value={detail?.phone_number}
        hint="Used for booking updates and WhatsApp verification"
        editing={editingField === 'phone'}
        onEdit={() => setEditingField('phone')}
      >
        <input
          className={inputClass}
          type="tel"
          value={personalForm.phone_number}
          onChange={(e) => setPersonalForm((f) => ({ ...f, phone_number: e.target.value }))}
          placeholder="+254…"
        />
        <EditActions
          saving={saving}
          onCancel={() => {
            setEditingField(null);
            syncFromDetail(detail);
          }}
          onSave={() => saveFields({ phone_number: personalForm.phone_number.trim() })}
        />
      </FieldRow>

      <FieldRow
        label="Date of birth"
        value={
          detail?.date_of_birth
            ? new Date(detail.date_of_birth).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })
            : null
        }
        editing={editingField === 'dob'}
        onEdit={() => setEditingField('dob')}
      >
        <input
          className={inputClass}
          type="date"
          value={personalForm.date_of_birth || ''}
          onChange={(e) => setPersonalForm((f) => ({ ...f, date_of_birth: e.target.value }))}
        />
        <EditActions
          saving={saving}
          onCancel={() => {
            setEditingField(null);
            syncFromDetail(detail);
          }}
          onSave={() => saveFields({ date_of_birth: personalForm.date_of_birth || null })}
        />
      </FieldRow>

      <FieldRow
        label="Gender"
        value={detail?.gender ? genderLabel : null}
        editing={editingField === 'gender'}
        onEdit={() => setEditingField('gender')}
      >
        <select
          className={inputClass}
          value={personalForm.gender}
          onChange={(e) => setPersonalForm((f) => ({ ...f, gender: e.target.value }))}
        >
          {GENDER_OPTIONS.map((opt) => (
            <option key={opt.value || 'empty'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <EditActions
          saving={saving}
          onCancel={() => {
            setEditingField(null);
            syncFromDetail(detail);
          }}
          onSave={() => saveFields({ gender: personalForm.gender || null })}
        />
      </FieldRow>

      <FieldRow
        label="About you"
        value={detail?.bio}
        editing={editingField === 'bio'}
        onEdit={() => setEditingField('bio')}
      >
        <textarea
          className={`${inputClass} min-h-[100px] resize-y`}
          maxLength={500}
          value={personalForm.bio}
          onChange={(e) => setPersonalForm((f) => ({ ...f, bio: e.target.value }))}
          placeholder="A short intro for hosts"
        />
        <p className="mt-1 text-xs text-gray-500">{personalForm.bio.length}/500</p>
        <EditActions
          saving={saving}
          onCancel={() => {
            setEditingField(null);
            syncFromDetail(detail);
          }}
          onSave={() => saveFields({ bio: personalForm.bio.trim() })}
        />
      </FieldRow>

      <FieldRow
        label="Lives in"
        value={placeLine || null}
        editing={editingField === 'location'}
        onEdit={() => setEditingField('location')}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">City</label>
            <input
              className={inputClass}
              value={personalForm.city}
              onChange={(e) => setPersonalForm((f) => ({ ...f, city: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Country</label>
            <input
              className={inputClass}
              value={personalForm.country}
              onChange={(e) => setPersonalForm((f) => ({ ...f, country: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Neighborhood / area</label>
            <input
              className={inputClass}
              value={personalForm.location}
              onChange={(e) => setPersonalForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="Optional"
            />
          </div>
        </div>
        <EditActions
          saving={saving}
          onCancel={() => {
            setEditingField(null);
            syncFromDetail(detail);
          }}
          onSave={() =>
            saveFields({
              city: personalForm.city.trim(),
              country: personalForm.country.trim(),
              location: personalForm.location.trim(),
            })
          }
        />
      </FieldRow>
    </div>
  );

  const renderLogin = () => (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Login & security</h2>
      <p className="text-sm text-gray-500 mb-6">Manage how you sign in to Msafiri Space.</p>

      <FieldRow label="Email" value={detail?.email || user?.email} hint="Email can’t be changed here" />

      <FieldRow
        label="Password"
        value="••••••••"
        editing={editingField === 'password'}
        onEdit={() => setEditingField('password')}
      >
        <div className="space-y-3 max-w-md">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Current password</label>
            <input
              className={inputClass}
              type="password"
              autoComplete="current-password"
              value={passwordForm.old_password}
              onChange={(e) => setPasswordForm((f) => ({ ...f, old_password: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">New password</label>
            <input
              className={inputClass}
              type="password"
              autoComplete="new-password"
              value={passwordForm.new_password}
              onChange={(e) => setPasswordForm((f) => ({ ...f, new_password: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Confirm new password</label>
            <input
              className={inputClass}
              type="password"
              autoComplete="new-password"
              value={passwordForm.new_password_confirm}
              onChange={(e) =>
                setPasswordForm((f) => ({ ...f, new_password_confirm: e.target.value }))
              }
            />
          </div>
        </div>
        <EditActions
          saving={saving}
          saveLabel="Update password"
          onCancel={() => {
            setEditingField(null);
            setPasswordForm({ old_password: '', new_password: '', new_password_confirm: '' });
          }}
          onSave={handlePasswordSave}
        />
      </FieldRow>

      <div className="py-5 border-b border-gray-200">
        <p className="text-sm font-semibold text-gray-900">Verification</p>
        <p className="mt-1 text-sm text-gray-700 inline-flex items-center gap-1.5">
          {detail?.account_verified || detail?.is_verified ? (
            <>
              <CheckBadgeIcon className="w-4 h-4 text-green-600" aria-hidden />
              Account verified
            </>
          ) : (
            'Not verified yet'
          )}
        </p>
      </div>

      <div className="pt-8">
        <button
          type="button"
          onClick={() => logout()}
          className="text-sm font-semibold text-red-600 hover:text-red-700"
        >
          Log out
        </button>
      </div>
    </div>
  );

  const renderPreferences = () => (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Preferences</h2>
      <p className="text-sm text-gray-500 mb-6">Language and currency for your trip experience.</p>

      <FieldRow
        label="Language"
        value={LANGUAGE_OPTIONS.find((o) => o.value === detail?.preferred_language)?.label}
        editing={editingField === 'language'}
        onEdit={() => setEditingField('language')}
      >
        <select
          className={inputClass}
          value={preferencesForm.preferred_language}
          onChange={(e) =>
            setPreferencesForm((f) => ({ ...f, preferred_language: e.target.value }))
          }
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <EditActions
          saving={saving}
          onCancel={() => {
            setEditingField(null);
            syncFromDetail(detail);
          }}
          onSave={() => saveFields({ preferred_language: preferencesForm.preferred_language })}
        />
      </FieldRow>

      <FieldRow
        label="Currency"
        value={CURRENCY_OPTIONS.find((o) => o.value === detail?.preferred_currency)?.label}
        editing={editingField === 'currency'}
        onEdit={() => setEditingField('currency')}
      >
        <select
          className={inputClass}
          value={preferencesForm.preferred_currency}
          onChange={(e) =>
            setPreferencesForm((f) => ({ ...f, preferred_currency: e.target.value }))
          }
        >
          {CURRENCY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <EditActions
          saving={saving}
          onCancel={() => {
            setEditingField(null);
            syncFromDetail(detail);
          }}
          onSave={() => saveFields({ preferred_currency: preferencesForm.preferred_currency })}
        />
      </FieldRow>

      <div className="mt-8 border border-gray-200 bg-white p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Your trips</p>
          <p className="text-sm text-gray-500">Upcoming, past, and saved places</p>
        </div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 text-sm font-semibold text-red-600 hover:text-red-700"
        >
          Open Trips
          <ChevronRightIcon className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pt-14 lg:pt-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-8">Account</h1>

        {loading ? (
          <div className="animate-pulse space-y-4" aria-busy="true">
            <div className="h-24 bg-white border border-gray-200" />
            <div className="h-64 bg-white border border-gray-200" />
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
            {/* Identity + nav */}
            <aside className="mb-8 lg:mb-0">
              <div className="bg-white border border-gray-200 p-5 text-center lg:text-left">
                <div className="relative inline-block">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 mx-auto lg:mx-0">
                    {photoUrl ? (
                      <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserCircleIcon className="w-full h-full text-gray-300" aria-hidden />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="absolute bottom-0 right-0 p-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    aria-label="Update profile photo"
                  >
                    <CameraIcon className="w-4 h-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                </div>
                <p className="mt-3 text-base font-semibold text-gray-900">{displayName}</p>
                {memberSince && (
                  <p className="text-xs text-gray-500 mt-0.5">Member since {memberSince}</p>
                )}
                {uploadingPhoto && (
                  <p className="text-xs text-gray-500 mt-2">Uploading photo…</p>
                )}
              </div>

              <nav className="mt-4 flex lg:flex-col gap-1 overflow-x-auto" aria-label="Account sections">
                {SECTIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSection(item.id);
                      setEditingField(null);
                    }}
                    className={`whitespace-nowrap px-3 py-2.5 text-sm font-semibold text-left border-b-2 lg:border-b-0 lg:border-l-2 ${
                      section === item.id
                        ? 'border-red-600 text-red-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>

              <div className="hidden lg:block mt-6 text-sm text-gray-500 space-y-2">
                <p className="inline-flex items-center gap-1.5">
                  <KeyIcon className="w-4 h-4" aria-hidden />
                  Keep your login details private
                </p>
              </div>
            </aside>

            {/* Section content — not a card wall; one calm column */}
            <main className="bg-white border border-gray-200 px-5 sm:px-8 py-6">
              {section === 'personal' && renderPersonal()}
              {section === 'login' && renderLogin()}
              {section === 'preferences' && renderPreferences()}
            </main>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
