import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  UserIcon,
  BuildingOffice2Icon,
  HomeModernIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  DocumentCheckIcon,
  IdentificationIcon,
  UserGroupIcon,
  LockClosedIcon,
  MapPinIcon,
  PhotoIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { authAPI, listingsAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import LocationPicker from './LocationPicker';

const PROPERTY_TYPE_OPTIONS = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'resort', label: 'Resort' },
  { value: 'boutique_hotel', label: 'Boutique Hotel' },
  { value: 'business_hotel', label: 'Business Hotel' },
  { value: 'luxury_hotel', label: 'Luxury Hotel' },
  { value: 'budget_hotel', label: 'Budget Hotel' },
  { value: 'bed_and_breakfast', label: 'Bed & Breakfast' },
  { value: 'hostel', label: 'Hostel' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'villa', label: 'Villa' },
];

// Cards group related questions together, Booking.com-style (e.g. their
// "Parking" card holds several related radio questions under one heading)
// instead of one lone field per screen. Each branch is a short, ordered
// list of cards; the wizard walks through whichever list applies once
// Steps 1-2 resolve which branch that is.
const CARDS = {
  hotel_restaurant: [
    {
      key: 'business', title: 'Business Details', icon: BuildingOfficeIcon,
      hint: 'Tell us about your hotel or restaurant.',
      fields: [
        { key: 'company_name', question: 'What is the name of your hotel or restaurant?', type: 'text', placeholder: 'e.g. Acacia Resort' },
        { key: 'contact_email', question: 'Email address', type: 'email' },
        { key: 'contact_phone', question: 'Phone number', type: 'tel' },
        { key: 'kra_pin', question: "What is your business's KRA PIN?", type: 'text', placeholder: 'P051234567X', uppercase: true },
      ],
    },
    {
      key: 'management', title: 'Management', icon: UserGroupIcon,
      hint: 'Who manages this property day to day?',
      fields: [
        { key: 'manager_name', question: 'Full name', type: 'text', placeholder: 'Full name' },
        { key: 'manager_contact', question: 'Phone or email', type: 'text', placeholder: 'Phone or email' },
        { key: 'manager_role', question: 'Role', type: 'role-select' },
      ],
    },
    {
      key: 'documents', title: 'Verification Documents', icon: DocumentCheckIcon,
      hint: 'Confirms your business is licensed and registered.',
      fields: [
        { key: 'business_permit', question: 'Business Permit', type: 'file' },
        { key: 'business_registration_certificate', question: 'Business Registration Certificate', type: 'file' },
      ],
    },
    {
      key: 'basics', title: 'Property Basics', icon: BuildingOfficeIcon,
      hint: 'A couple quick details about your property.',
      fields: [
        { key: 'property_type', question: 'What type of property is this?', type: 'select', options: PROPERTY_TYPE_OPTIONS },
        { key: 'star_rating', question: 'Star rating', type: 'star-select' },
      ],
    },
    {
      key: 'location', title: 'Location', icon: MapPinIcon,
      hint: 'Search for your address or drop a pin on the map.',
      custom: 'location',
    },
    {
      key: 'photos', title: 'Showcase Photos', icon: PhotoIcon,
      hint: 'Add at least 3 photos so guests can see your property. You can add more anytime from your dashboard.',
      custom: 'photos',
    },
  ],
  bnb_individual: [
    {
      key: 'owner', title: 'Owner Details', icon: UserIcon,
      hint: "Let's start with who owns this property.",
      fields: [
        { key: 'owner_name', question: "What's your full name?", type: 'text', placeholder: 'Jane Doe' },
        { key: 'owner_kra_pin', question: 'What is your KRA PIN?', type: 'text', placeholder: 'A012345678Z', uppercase: true },
        { key: 'owner_id_number', question: 'What is your National ID number?', type: 'text', placeholder: '12345678' },
      ],
    },
    {
      key: 'identity', title: 'Identity Documents', icon: IdentificationIcon,
      hint: 'Used to verify your identity. Clear photos, all corners visible.',
      fields: [
        { key: 'owner_id_front', question: 'Front of ID', type: 'file' },
        { key: 'owner_id_back', question: 'Back of ID', type: 'file' },
        { key: 'owner_permit', question: 'Permit, if you have one', type: 'file', optional: true },
      ],
    },
    {
      key: 'contact', title: 'Contact', icon: PhoneIcon,
      hint: "We'll send booking alerts and account updates here.",
      fields: [
        { key: 'contact_email', question: 'Email address', type: 'email' },
        { key: 'contact_phone', question: 'Phone number', type: 'tel' },
      ],
    },
  ],
  bnb_company: [
    {
      key: 'company', title: 'Company Details', icon: BuildingOffice2Icon,
      hint: 'Tell us about your company.',
      fields: [
        { key: 'company_name', question: 'What is your company or business name?', type: 'text', placeholder: 'Coastal Stays Ltd' },
        { key: 'company_kra_pin', question: "What is your company's KRA PIN?", type: 'text', placeholder: 'P051234567X', uppercase: true },
      ],
    },
    {
      key: 'documents', title: 'Verification & Contact', icon: DocumentCheckIcon,
      hint: 'Confirms your business is licensed to operate.',
      fields: [
        { key: 'company_permit', question: 'Business permit', type: 'file' },
        { key: 'contact_email', question: 'Email address', type: 'email' },
        { key: 'contact_phone', question: 'Phone number', type: 'tel' },
      ],
    },
  ],
};

// Signed-out visitors get this prepended to whichever branch list applies --
// same minimal pattern Booking.com uses for "Create your partner account"
// right at the start of their host flow, so account creation reads as the
// first card rather than a detour to a separate page.
const ACCOUNT_CARD = {
  key: 'account', title: "Let's create your host account", icon: LockClosedIcon,
  hint: 'This creates your login too -- no separate sign-up needed.',
  fields: [
    { key: 'contact_email', question: 'Email address', type: 'email' },
    { key: 'password', question: 'Create a password (min. 8 characters)', type: 'password' },
  ],
};

const emptyData = () => ({
  company_name: '', contact_email: '', contact_phone: '', kra_pin: '',
  manager_name: '', manager_contact: '', manager_role: '',
  business_permit: null, business_registration_certificate: null,
  owner_name: '', owner_kra_pin: '', owner_id_number: '',
  owner_id_front: null, owner_id_back: null, owner_permit: null,
  company_kra_pin: '', company_permit: null,
  password: '',
  // Hotel/Restaurant only -- the wizard creates the Hotel listing directly,
  // so these live here alongside the KYC fields instead of a separate form.
  property_type: 'hotel', star_rating: 3,
  address: '', city: '', state_province: '', country: 'Kenya', postal_code: '',
  latitude: '', longitude: '',
  photos: [],
});

const PhotosField = ({ files, onChange }) => {
  const addFiles = (fileList) => {
    onChange([...files, ...Array.from(fileList)]);
  };
  const removeAt = (index) => onChange(files.filter((_, i) => i !== index));

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => e.target.files?.length && addFiles(e.target.files)}
        className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-none file:border-0 file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
      />
      <p className="mt-2 text-xs text-gray-500">{files.length} of at least 3 photos added</p>
      {files.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="relative">
              <img src={URL.createObjectURL(file)} alt="" className="w-full h-20 object-cover" />
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="absolute top-1 right-1 bg-white/90 text-gray-700 text-xs w-5 h-5 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const HostOnboardingWizard = ({ onComplete }) => {
  const { isAuthenticated, establishSession, getMe } = useAuth();
  const [outerStep, setOuterStep] = useState(1); // 1 = account type, 2 = host category, 3 = KYC cards
  const [accountType, setAccountType] = useState(null);
  const [hostCategory, setHostCategory] = useState(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [data, setData] = useState(emptyData());
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const branchKey = hostCategory === 'hotel_restaurant'
    ? 'hotel_restaurant'
    : accountType === 'company' ? 'bnb_company' : 'bnb_individual';
  const baseCards = CARDS[branchKey] || [];
  const cards = isAuthenticated ? baseCards : [ACCOUNT_CARD, ...baseCards];
  const card = cards[cardIndex];
  // Signed-out visitors already gave their email on the account card, so
  // any other card's email field would just be asking a second time.
  const visibleFields = card?.fields
    ? card.fields.filter((f) => card.key === 'account' || f.key !== 'contact_email' || isAuthenticated)
    : [];

  const setField = (key, value) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setError('');
  };

  const isFieldFilled = (field) => {
    if (field.type === 'file') return field.optional || Boolean(data[field.key]);
    return Boolean(String(data[field.key] || '').trim());
  };

  const isCardFilled = () => {
    if (!card) return false;
    if (card.custom === 'location') return Boolean(data.address.trim() && data.city.trim() && data.country.trim());
    if (card.custom === 'photos') return data.photos.length >= 3;
    return visibleFields.every((f) => {
      if (f.type === 'password') return data.password.length >= 8;
      return isFieldFilled(f);
    });
  };

  const goToKycStep3 = () => {
    setCardIndex(0);
    setOuterStep(3);
  };

  const handleCardNext = async () => {
    if (!isCardFilled()) {
      setError('Please fill in all fields before continuing.');
      return;
    }
    if (cardIndex < cards.length - 1) {
      setCardIndex((i) => i + 1);
      return;
    }
    await submit();
  };

  const handleBack = () => {
    setError('');
    if (outerStep === 3) {
      if (cardIndex > 0) {
        setCardIndex((i) => i - 1);
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
      Object.entries(data).forEach(([key, value]) => {
        // photos and the hotel-listing fields below aren't part of the KYC
        // payload -- photos in particular is an array, which FormData would
        // otherwise silently mangle into a garbage string.
        if (key === 'photos') return;
        if (value !== null && value !== '') {
          formData.append(key, value);
        }
      });

      const response = await authAPI.onboardHostFormData(formData);
      if (response?.tokens) {
        establishSession({ user: response.user, tokens: response.tokens });
        // The account card disappears from `cards` the instant isAuthenticated
        // flips true, shifting every later index back by one -- keep
        // cardIndex pointing at the same logical card so a later failure
        // (e.g. hotel creation below) doesn't strand the UI on an
        // out-of-bounds card.
        setCardIndex((i) => Math.max(0, i - 1));
      }

      if (hostCategory === 'hotel_restaurant') {
        const hotel = await listingsAPI.createListing({
          name: data.company_name,
          property_type: data.property_type,
          star_rating: data.star_rating,
          address: data.address,
          city: data.city,
          state_province: data.state_province,
          country: data.country,
          postal_code: data.postal_code,
          latitude: data.latitude === '' ? null : data.latitude,
          longitude: data.longitude === '' ? null : data.longitude,
          phone: data.contact_phone,
          email: data.contact_email,
        });
        // Photo upload failures shouldn't block the listing from existing --
        // photos can always be added afterward from the hotel dashboard.
        await Promise.all(
          data.photos.map((file) => listingsAPI.uploadHotelImage(hotel.id, { file }).catch(() => null))
        );
        // Creating the hotel is what grants the hotel_host role server-side
        // (see HotelListCreateView.perform_create) -- refresh the session so
        // the Redux user object has that role before landing on the
        // role-gated /host/hotels dashboard, or RoleGuard bounces them home.
        await getMe().catch(() => null);
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

  const renderFieldInput = (field, index) => {
    const baseClasses = 'w-full px-4 py-3 border border-gray-300 rounded-none text-base focus:ring-2 focus:ring-red-500 focus:border-transparent';
    if (field.type === 'file') {
      return (
        <div>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setField(field.key, e.target.files?.[0] || null)}
            className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-none file:border-0 file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
          />
          {data[field.key] && (
            <p className="mt-2 text-xs text-gray-500">Selected: {data[field.key].name}</p>
          )}
        </div>
      );
    }
    if (field.type === 'select') {
      return (
        <select
          value={data[field.key]}
          onChange={(e) => setField(field.key, e.target.value)}
          className={baseClasses}
        >
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }
    if (field.type === 'star-select') {
      return (
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setField('star_rating', n)}
              className={`w-10 h-10 border flex items-center justify-center transition-colors ${
                n <= data.star_rating ? 'border-yellow-400 bg-yellow-50 text-yellow-500' : 'border-gray-300 text-gray-300'
              }`}
            >
              <StarIcon className="w-5 h-5" />
            </button>
          ))}
        </div>
      );
    }
    if (field.type === 'role-select') {
      return (
        <div className="flex gap-3">
          {[['manager', 'Manager'], ['director', 'Director']].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setField('manager_role', value)}
              className={`flex-1 px-4 py-2 rounded-none border text-sm font-medium transition-colors ${
                data.manager_role === value
                  ? 'bg-red-600 border-red-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-red-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      );
    }
    const inputType = field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : field.type === 'password' ? 'password' : 'text';
    return (
      <input
        type={inputType}
        autoFocus={index === 0}
        value={data[field.key]}
        onChange={(e) => setField(field.key, field.uppercase ? e.target.value.toUpperCase() : e.target.value)}
        placeholder={field.placeholder}
        className={baseClasses}
      />
    );
  };

  // Compact progress dots: 2 for the intro choices + one per KYC card
  const totalDots = 2 + cards.length;
  const currentDot = outerStep === 3 ? 2 + cardIndex : outerStep - 1;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-none shadow-lg border border-gray-100 p-8">
        <div className="flex items-center gap-1.5 mb-6">
          {Array.from({ length: totalDots }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-none ${i <= currentDot ? 'bg-red-600' : 'bg-gray-200'}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${outerStep}-${cardIndex}`}
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
                      className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-none hover:border-red-400 hover:bg-red-50/40 transition-colors text-left"
                    >
                      <span className="w-10 h-10 rounded-none bg-red-50 flex items-center justify-center flex-shrink-0">
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
                      className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-none hover:border-red-400 hover:bg-red-50/40 transition-colors text-left"
                    >
                      <span className="w-10 h-10 rounded-none bg-red-50 flex items-center justify-center flex-shrink-0">
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

            {outerStep === 3 && card && (
              <div>
                {card.icon && (
                  <span className="w-11 h-11 rounded-none bg-red-50 flex items-center justify-center mb-4">
                    <card.icon className="w-5 h-5 text-red-600" />
                  </span>
                )}
                <h2 className="text-lg font-semibold text-gray-900 mb-1">{card.title}</h2>
                {card.hint && <p className="text-sm text-gray-500 mb-4">{card.hint}</p>}
                <div className="border-t border-gray-200 pt-5 space-y-5">
                  {card.custom === 'location' && (
                    <LocationPicker
                      value={data}
                      onChange={(patch) => setData((prev) => ({ ...prev, ...patch }))}
                    />
                  )}
                  {card.custom === 'photos' && (
                    <PhotosField
                      files={data.photos}
                      onChange={(files) => setField('photos', files)}
                    />
                  )}
                  {!card.custom && visibleFields.map((field, index) => (
                    <div key={field.key}>
                      <p className="text-sm font-medium text-gray-900 mb-2">
                        {field.question}
                        {field.optional && <span className="text-gray-400 font-normal"> (optional)</span>}
                      </p>
                      {renderFieldInput(field, index)}
                    </div>
                  ))}
                </div>
                {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
                <button
                  type="button"
                  onClick={handleCardNext}
                  disabled={isSubmitting}
                  className="mt-6 w-full py-3 bg-red-600 text-white rounded-none font-medium hover:bg-red-700 disabled:opacity-60"
                >
                  {isSubmitting ? 'Submitting...' : cardIndex === cards.length - 1 ? 'Finish' : 'Continue'}
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
