import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  UserIcon,
  BuildingOffice2Icon,
  HomeModernIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  DocumentTextIcon,
  DocumentCheckIcon,
  IdentificationIcon,
  UserGroupIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { authAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

// One question/field-group per screen, Booking.com-style: an icon, a short
// question, and a one-line hint explaining why we're asking -- so each card
// stands on its own instead of just naming a field with no context.
const SCREENS = {
  hotel_restaurant: [
    { key: 'company_name', label: 'What is the name of your hotel or restaurant?', hint: "This is how guests will find you on Msafiri Space.", type: 'text', placeholder: 'e.g. Acacia Resort', icon: BuildingOfficeIcon },
    { key: 'contact', label: 'How should we reach you?', hint: "We'll send booking alerts and account updates here.", type: 'contact', icon: PhoneIcon },
    { key: 'kra_pin', label: "What is your business's KRA PIN?", hint: 'Used to verify your business for tax compliance.', type: 'text', placeholder: 'P051234567X', uppercase: true, icon: DocumentTextIcon },
    { key: 'manager', label: 'Who manages this property day to day?', hint: 'The person guests and our team can reach on-site.', type: 'manager', icon: UserGroupIcon },
    { key: 'business_permit', label: 'Upload your Business Permit', hint: 'Confirms you’re licensed to operate this business.', type: 'file', icon: DocumentCheckIcon },
    { key: 'business_registration_certificate', label: 'Upload your Business Registration Certificate', hint: 'Proof your business is officially registered.', type: 'file', icon: DocumentCheckIcon },
  ],
  bnb_individual: [
    { key: 'owner_name', label: "What's your full name?", hint: "Let's start with who owns this property.", type: 'text', placeholder: 'Jane Doe', icon: UserIcon },
    { key: 'owner_kra_pin', label: 'What is your KRA PIN?', hint: 'Used to verify your tax compliance as a host.', type: 'text', placeholder: 'A012345678Z', uppercase: true, icon: DocumentTextIcon },
    { key: 'owner_id_number', label: 'What is your National ID number?', hint: 'Helps us confirm your identity.', type: 'text', placeholder: '12345678', icon: IdentificationIcon },
    { key: 'owner_id_front', label: 'Upload the FRONT of your ID', hint: 'A clear photo, all four corners visible.', type: 'file', icon: IdentificationIcon },
    { key: 'owner_id_back', label: 'Upload the BACK of your ID', hint: 'A clear photo, all four corners visible.', type: 'file', icon: IdentificationIcon },
    { key: 'owner_permit', label: 'Upload a permit, if you have one', hint: 'Not every host needs one -- skip if it doesn’t apply.', type: 'file', optional: true, icon: DocumentCheckIcon },
    { key: 'contact', label: 'How should we reach you?', hint: "We'll send booking alerts and account updates here.", type: 'contact', icon: PhoneIcon },
  ],
  bnb_company: [
    { key: 'company_name', label: 'What is your company or business name?', hint: 'This is how guests will find you on Msafiri Space.', type: 'text', placeholder: 'Coastal Stays Ltd', icon: BuildingOffice2Icon },
    { key: 'company_kra_pin', label: "What is your company's KRA PIN?", hint: "Used to verify your company's tax compliance.", type: 'text', placeholder: 'P051234567X', uppercase: true, icon: DocumentTextIcon },
    { key: 'company_permit', label: 'Upload your business permit', hint: 'Confirms your business is licensed to operate.', type: 'file', icon: DocumentCheckIcon },
    { key: 'contact', label: 'How should we reach you?', hint: "We'll send booking alerts and account updates here.", type: 'contact', icon: PhoneIcon },
  ],
};

// Signed-out visitors get this prepended to whichever branch list applies --
// same minimal one-screen pattern Booking.com uses for "Create your partner
// account" right at the start of their host flow, so account creation reads
// as the first KYC screen rather than a detour to a separate page.
const ACCOUNT_SCREEN = {
  key: 'account',
  label: "Let's create your host account",
  hint: 'This creates your login too -- no separate sign-up needed.',
  type: 'account',
  icon: LockClosedIcon,
};

const emptyData = () => ({
  company_name: '', contact_email: '', contact_phone: '', kra_pin: '',
  manager_name: '', manager_contact: '', manager_role: '',
  business_permit: null, business_registration_certificate: null,
  owner_name: '', owner_kra_pin: '', owner_id_number: '',
  owner_id_front: null, owner_id_back: null, owner_permit: null,
  company_kra_pin: '', company_permit: null,
  password: '',
});

const HostOnboardingWizard = ({ onComplete }) => {
  const { isAuthenticated, establishSession } = useAuth();
  const [outerStep, setOuterStep] = useState(1); // 1 = account type, 2 = host category, 3 = KYC sub-stepper
  const [accountType, setAccountType] = useState(null);
  const [hostCategory, setHostCategory] = useState(null);
  const [kycIndex, setKycIndex] = useState(0);
  const [data, setData] = useState(emptyData());
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const branchKey = hostCategory === 'hotel_restaurant'
    ? 'hotel_restaurant'
    : accountType === 'company' ? 'bnb_company' : 'bnb_individual';
  const baseScreens = SCREENS[branchKey] || [];
  const screens = isAuthenticated ? baseScreens : [ACCOUNT_SCREEN, ...baseScreens];
  const screen = screens[kycIndex];
  // Signed-out visitors already gave their email on the account screen, so
  // the shared "contact" screen that follows is really just asking for phone.
  const screenLabel = screen?.type === 'contact' && !isAuthenticated ? 'What is your phone number?' : screen?.label;
  const screenHint = screen?.type === 'contact' && !isAuthenticated ? "We'll send booking alerts and account updates here." : screen?.hint;

  const setField = (key, value) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setError('');
  };

  const isScreenFilled = () => {
    if (!screen) return false;
    if (screen.type === 'account') return Boolean(data.contact_email.trim() && data.password.length >= 8);
    if (screen.type === 'contact') {
      // Signed-out visitors already gave their email on the account screen
      // that precedes this one -- only phone is still needed here.
      return isAuthenticated
        ? Boolean(data.contact_email.trim() && data.contact_phone.trim())
        : Boolean(data.contact_phone.trim());
    }
    if (screen.type === 'manager') return Boolean(data.manager_name.trim() && data.manager_contact.trim() && data.manager_role);
    if (screen.optional) return true;
    return Boolean(data[screen.key]);
  };

  const goToKycStep3 = () => {
    setKycIndex(0);
    setOuterStep(3);
  };

  const handleKycNext = async () => {
    if (!isScreenFilled()) {
      setError('Please fill this in before continuing.');
      return;
    }
    if (kycIndex < screens.length - 1) {
      setKycIndex((i) => i + 1);
      return;
    }
    await submit();
  };

  const handleBack = () => {
    setError('');
    if (outerStep === 3) {
      if (kycIndex > 0) {
        setKycIndex((i) => i - 1);
      } else {
        setOuterStep(2);
      }
      return;
    }
    setOuterStep((s) => Math.max(1, s - 1));
  };

  const submit = async () => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('account_type', accountType);
      formData.append('host_category', hostCategory);
      screens.forEach((s) => {
        if (s.type === 'account') {
          formData.append('contact_email', data.contact_email);
          formData.append('password', data.password);
        } else if (s.type === 'contact') {
          formData.append('contact_email', data.contact_email);
          formData.append('contact_phone', data.contact_phone);
        } else if (s.type === 'manager') {
          formData.append('manager_name', data.manager_name);
          formData.append('manager_contact', data.manager_contact);
          formData.append('manager_role', data.manager_role);
        } else if (data[s.key] !== null && data[s.key] !== '') {
          formData.append(s.key, data[s.key]);
        }
      });

      const response = await authAPI.onboardHostFormData(formData);
      if (response?.tokens) {
        establishSession({ user: response.user, tokens: response.tokens });
      }
      toast.success('Onboarding complete! Now let\'s set up your listing.');
      onComplete(hostCategory);
    } catch (err) {
      const backendErrors = err?.response?.data;
      const firstMessage = backendErrors && typeof backendErrors === 'object'
        ? Object.values(backendErrors)[0]
        : null;
      const message = Array.isArray(firstMessage) ? firstMessage[0] : (firstMessage || 'Something went wrong. Please try again.');
      setError(message);
      toast.error('Could not complete onboarding');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = () => {
    if (!screen) return null;
    if (screen.type === 'text') {
      return (
        <input
          type="text"
          autoFocus
          value={data[screen.key]}
          onChange={(e) => setField(screen.key, screen.uppercase ? e.target.value.toUpperCase() : e.target.value)}
          placeholder={screen.placeholder}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
        />
      );
    }
    if (screen.type === 'file') {
      return (
        <div>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setField(screen.key, e.target.files?.[0] || null)}
            className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
          />
          {data[screen.key] && (
            <p className="mt-2 text-xs text-gray-500">Selected: {data[screen.key].name}</p>
          )}
          {screen.optional && (
            <button
              type="button"
              onClick={handleKycNext}
              className="mt-3 text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Skip this step
            </button>
          )}
        </div>
      );
    }
    if (screen.type === 'account') {
      return (
        <div className="space-y-3">
          <input
            type="email"
            autoFocus
            value={data.contact_email}
            onChange={(e) => setField('contact_email', e.target.value)}
            placeholder="Email address"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
          <input
            type="password"
            value={data.password}
            onChange={(e) => setField('password', e.target.value)}
            placeholder="Create a password (min. 8 characters)"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      );
    }
    if (screen.type === 'contact') {
      return (
        <div className="space-y-3">
          {isAuthenticated && (
            <input
              type="email"
              autoFocus
              value={data.contact_email}
              onChange={(e) => setField('contact_email', e.target.value)}
              placeholder="Email address"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          )}
          <input
            type="tel"
            autoFocus={!isAuthenticated}
            value={data.contact_phone}
            onChange={(e) => setField('contact_phone', e.target.value)}
            placeholder="Phone number"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      );
    }
    if (screen.type === 'manager') {
      return (
        <div className="space-y-3">
          <input
            type="text"
            autoFocus
            value={data.manager_name}
            onChange={(e) => setField('manager_name', e.target.value)}
            placeholder="Full name"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
          <input
            type="text"
            value={data.manager_contact}
            onChange={(e) => setField('manager_contact', e.target.value)}
            placeholder="Phone or email"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
          <div className="flex gap-3">
            {[['manager', 'Manager'], ['director', 'Director']].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setField('manager_role', value)}
                className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  data.manager_role === value
                    ? 'bg-red-600 border-red-600 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-red-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // Compact progress dots: 2 for the intro choices + one per KYC screen
  const totalDots = 2 + screens.length;
  const currentDot = outerStep === 3 ? 2 + kycIndex : outerStep - 1;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <div className="flex items-center gap-1.5 mb-6">
          {Array.from({ length: totalDots }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i <= currentDot ? 'bg-red-600' : 'bg-gray-200'}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${outerStep}-${kycIndex}`}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
          >
            {outerStep === 1 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Are you an individual or a company?</h2>
                <p className="text-sm text-gray-500 mb-6">This helps us know what information to collect.</p>
                <div className="space-y-3">
                  {[
                    { value: 'individual', label: 'Individual', icon: UserIcon, desc: 'I own or manage this myself' },
                    { value: 'company', label: 'Company', icon: BuildingOffice2Icon, desc: 'A registered business operates this' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setAccountType(opt.value); setOuterStep(2); }}
                      className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-red-400 hover:bg-red-50/40 transition-colors text-left"
                    >
                      <span className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                        <opt.icon className="w-5 h-5 text-red-600" />
                      </span>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{opt.label}</p>
                        <p className="text-xs text-gray-500">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {outerStep === 2 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">What would you like to list?</h2>
                <p className="text-sm text-gray-500 mb-6">You can only choose one for this account.</p>
                <div className="space-y-3">
                  {[
                    { value: 'bnb', label: 'BnB', icon: HomeModernIcon, desc: 'A home, apartment, or unit you rent out' },
                    { value: 'hotel_restaurant', label: 'Hotel / Restaurant', icon: BuildingOfficeIcon, desc: 'A registered hospitality business' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setHostCategory(opt.value); goToKycStep3(); }}
                      className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-red-400 hover:bg-red-50/40 transition-colors text-left"
                    >
                      <span className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                        <opt.icon className="w-5 h-5 text-red-600" />
                      </span>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{opt.label}</p>
                        <p className="text-xs text-gray-500">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {outerStep === 3 && screen && (
              <div>
                {screen.icon && (
                  <span className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center mb-4">
                    <screen.icon className="w-5 h-5 text-red-600" />
                  </span>
                )}
                <h2 className="text-lg font-semibold text-gray-900 mb-1">{screenLabel}</h2>
                {screenHint && <p className="text-sm text-gray-500 mb-6">{screenHint}</p>}
                {renderField()}
                {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
                <button
                  type="button"
                  onClick={handleKycNext}
                  disabled={isSubmitting}
                  className="mt-6 w-full py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-60"
                >
                  {isSubmitting ? 'Submitting...' : kycIndex === screens.length - 1 ? 'Finish' : 'Continue'}
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {(outerStep > 1) && (
          <button
            type="button"
            onClick={handleBack}
            className="mt-4 text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  );
};

export default HostOnboardingWizard;
