import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, CheckIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { listingsAPI } from '../services/api';
import {
  buildAmenityIndex,
  normalizeAmenityToken,
  resolveHotelAmenityName,
} from '../utils/hotelAmenities';

const STEPS = [
  { id: 1, label: 'Basics' },
  { id: 2, label: 'Location' },
  { id: 3, label: 'Amenities' },
  { id: 4, label: 'Review' },
];

const PROPERTY_TYPES = [
  { value: 'hotel', label: 'Hotel', hint: 'Full-service stay' },
  { value: 'resort', label: 'Resort', hint: 'Leisure destination' },
  { value: 'lodge', label: 'Lodge', hint: 'Nature / safari' },
  { value: 'boutique', label: 'Boutique', hint: 'Intimate & styled' },
];

const AMENITY_OPTIONS = [
  'Wi-Fi',
  'Parking',
  'Pool',
  'Spa',
  'Gym',
  'Restaurant',
  'Bar',
  'Room Service',
  'Air Conditioning',
  'Airport Shuttle',
  '24/7 Front Desk',
  'Breakfast Included',
  'Business Center',
  'Meeting Rooms',
];

const inputClass =
  'w-full border border-gray-300 px-3.5 py-3 text-base text-gray-900 placeholder:text-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500';

const ListHotelPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    property_type: 'hotel',
    star_rating: 3,
    address: '',
    city: '',
    country: 'Kenya',
    amenities: [],
  });

  const progress = useMemo(() => ((step - 1) / (STEPS.length - 1)) * 100, [step]);
  const stepMeta = STEPS.find((s) => s.id === step) || STEPS[0];

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const toggleAmenity = (name) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(name)
        ? prev.amenities.filter((a) => a !== name)
        : [...prev.amenities, name],
    }));
  };

  const validate = (current) => {
    if (current === 1) {
      if (!form.name.trim()) return 'Give your place a name to continue.';
    }
    if (current === 2) {
      if (!form.city.trim()) return 'City is required.';
      if (!form.address.trim()) return 'Address is required.';
    }
    return '';
  };

  const goNext = () => {
    const message = validate(step);
    if (message) {
      setError(message);
      return;
    }
    setError('');
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const goBack = () => {
    setError('');
    if (step === 1) {
      navigate('/host-dashboard');
      return;
    }
    setStep((s) => Math.max(s - 1, 1));
  };

  const extractErrorMessage = (err) => {
    const data = err?.response?.data;
    if (!data) return err?.message || 'Failed to create hotel. Please try again.';
    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;
    const firstKey = Object.keys(data)[0];
    if (firstKey && Array.isArray(data[firstKey]) && data[firstKey].length) {
      return `${firstKey}: ${data[firstKey][0]}`;
    }
    if (firstKey && typeof data[firstKey] === 'string') {
      return `${firstKey}: ${data[firstKey]}`;
    }
    return err?.message || 'Failed to create hotel. Please try again.';
  };

  const handleCreate = async () => {
    const message = validate(2);
    if (message) {
      setError(message);
      setStep(2);
      return;
    }
    if (!form.name.trim()) {
      setError('Give your place a name to continue.');
      setStep(1);
      return;
    }

    setLoading(true);
    setError('');
    let created = null;

    try {
      const description =
        form.description.trim() ||
        `${form.name.trim()} — a ${form.star_rating}-star ${form.property_type} in ${form.city.trim() || 'Kenya'}.`;

      created = await listingsAPI.createListing({
        name: form.name.trim(),
        description,
        short_description: description.slice(0, 500),
        property_type: form.property_type || 'hotel',
        star_rating: Number(form.star_rating) || 3,
        address: form.address.trim(),
        city: form.city.trim(),
        country: form.country || 'Kenya',
        check_in_time: '14:00:00',
        check_out_time: '11:00:00',
        maximum_nights: 30,
      });

      const hotelId = created.id;
      const problems = [];

      if (form.amenities.length) {
        try {
          const amenityResponse = await listingsAPI.getHotelAmenities();
          const amenityRows = amenityResponse?.results || amenityResponse || [];
          const amenityIndex = buildAmenityIndex(amenityRows);
          const resolved = form.amenities
            .map(resolveHotelAmenityName)
            .filter(Boolean)
            .map((name) => amenityIndex.get(normalizeAmenityToken(name)))
            .filter(Boolean);

          if (resolved.length) {
            const results = await Promise.allSettled(
              resolved.map((amenityId) => listingsAPI.addHotelAmenity(hotelId, amenityId))
            );
            const failed = results.filter((r) => r.status === 'rejected').length;
            if (failed > 0) {
              problems.push(`${failed} amenit${failed === 1 ? 'y' : 'ies'} failed to save`);
            }
          }
        } catch (_) {
          problems.push('amenities could not be saved');
        }
      }

      if (problems.length) {
        toast.error(`Hotel created, but ${problems.join(' and ')}. You can finish setup next.`, {
          duration: 7000,
        });
      } else {
        toast.success('Hotel created — set up your rooms next.');
      }

      navigate('/host-dashboard', {
        replace: true,
        state: {
          initialTab: 'rooms',
          selectedHotelForRooms: hotelId,
          successMessage: 'Hotel created. Add room types so guests can book.',
        },
      });
    } catch (err) {
      if (created?.id) {
        toast.error(`Hotel created, but: ${extractErrorMessage(err)}`);
        navigate('/host-dashboard', {
          replace: true,
          state: {
            initialTab: 'rooms',
            selectedHotelForRooms: created.id,
          },
        });
        return;
      }
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const typeLabel =
    PROPERTY_TYPES.find((t) => t.value === form.property_type)?.label || 'Hotel';

  return (
    <div className="min-h-screen bg-gray-50 pt-16 lg:pt-20">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            {step === 1 ? 'Back to Property' : 'Back'}
          </button>
          <p className="text-sm text-gray-500">
            Step {step} of {STEPS.length} · {stepMeta.label}
          </p>
        </div>
        <div className="h-1 w-full bg-gray-100">
          <div
            className="h-1 bg-red-600 transition-all duration-300"
            style={{ width: `${Math.max(progress, step === 1 ? 8 : progress)}%` }}
          />
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            {form.name.trim() || 'New hotel'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            List your property, then set up rooms so guests can book.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <div className="border border-gray-200 bg-white">
          <div className="px-5 py-6 sm:px-8 sm:py-8">
            {step === 1 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    What’s the name of your place?
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">Guests will see this first.</p>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => update({ name: e.target.value })}
                    data-testid="host-hotel-name-input"
                    className={`${inputClass} mt-4`}
                    placeholder="e.g. Acacia Resort"
                    autoFocus
                  />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-gray-900">What kind of place is it?</h2>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {PROPERTY_TYPES.map((type) => {
                      const selected = form.property_type === type.value;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => update({ property_type: type.value })}
                          className={`border px-3 py-3 text-left transition-colors ${
                            selected
                              ? 'border-red-600 bg-red-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <p
                            className={`text-sm font-semibold ${
                              selected ? 'text-red-700' : 'text-gray-900'
                            }`}
                          >
                            {type.label}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">{type.hint}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Star rating</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {form.star_rating}-star {typeLabel.toLowerCase()}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Star rating">
                    {[1, 2, 3, 4, 5].map((stars) => {
                      const selected = Number(form.star_rating) === stars;
                      return (
                        <button
                          key={stars}
                          type="button"
                          onClick={() => update({ star_rating: stars })}
                          className={`min-w-[3rem] border px-3 py-2 text-sm font-medium ${
                            selected
                              ? 'border-red-600 bg-red-50 text-red-700'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {stars}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Short description{' '}
                      <span className="font-normal text-gray-500">(optional)</span>
                    </h2>
                    <span className="text-xs text-gray-500">{form.description.length}/500</span>
                  </div>
                  <textarea
                    value={form.description}
                    onChange={(e) => update({ description: e.target.value.slice(0, 500) })}
                    rows={4}
                    className={`${inputClass} mt-3 resize-y`}
                    placeholder="What makes this stay special?"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Where is it?</h2>
                  <p className="mt-1 text-sm text-gray-500">Help guests find you.</p>
                </div>

                <div>
                  <label htmlFor="hotel-city" className="mb-1.5 block text-sm font-medium text-gray-900">
                    City
                  </label>
                  <input
                    id="hotel-city"
                    type="text"
                    value={form.city}
                    onChange={(e) => update({ city: e.target.value })}
                    className={inputClass}
                    placeholder="e.g. Nairobi"
                  />
                </div>

                <div>
                  <label
                    htmlFor="hotel-address"
                    className="mb-1.5 block text-sm font-medium text-gray-900"
                  >
                    Address
                  </label>
                  <input
                    id="hotel-address"
                    type="text"
                    value={form.address}
                    onChange={(e) => update({ address: e.target.value })}
                    className={inputClass}
                    placeholder="Street, ward, or landmark"
                  />
                </div>

                <div>
                  <label
                    htmlFor="hotel-country"
                    className="mb-1.5 block text-sm font-medium text-gray-900"
                  >
                    Country
                  </label>
                  <input
                    id="hotel-country"
                    type="text"
                    value={form.country}
                    onChange={(e) => update({ country: e.target.value })}
                    className={inputClass}
                    placeholder="Kenya"
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">What does your place offer?</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Optional — you can refine amenities later.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {AMENITY_OPTIONS.map((amenity) => {
                    const selected = form.amenities.includes(amenity);
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => toggleAmenity(amenity)}
                        className={`inline-flex items-center gap-1.5 border px-3 py-2 text-sm font-medium ${
                          selected
                            ? 'border-red-600 bg-red-50 text-red-700'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {selected && <CheckIcon className="h-3.5 w-3.5" />}
                        {amenity}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Looks good?</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Create the hotel, then add room types so guests can book.
                  </p>
                </div>

                <div className="border border-gray-200 bg-gray-50 px-4 py-4 space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Basics
                    </p>
                    <p className="mt-1 text-base font-semibold text-gray-900">
                      {form.name.trim() || 'Untitled hotel'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {typeLabel} · {form.star_rating}-star
                    </p>
                    {form.description.trim() ? (
                      <p className="mt-2 text-sm text-gray-600 line-clamp-3">
                        {form.description.trim()}
                      </p>
                    ) : null}
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Location
                    </p>
                    <p className="mt-1 text-sm text-gray-800">
                      {form.address.trim() || '—'}
                      {form.city.trim() ? `, ${form.city.trim()}` : ''}
                      {form.country ? `, ${form.country}` : ''}
                    </p>
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Amenities
                    </p>
                    <p className="mt-1 text-sm text-gray-800">
                      {form.amenities.length
                        ? form.amenities.join(' · ')
                        : 'None selected yet'}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-gray-500">
                  Next you’ll set up room types, photos, and availability on the Property tab.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-5 py-4 sm:px-8">
            <button
              type="button"
              onClick={goBack}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              {step === 1 ? 'Cancel' : 'Back'}
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={goNext}
                data-testid="host-hotel-continue"
                className="bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreate}
                disabled={loading}
                data-testid="host-hotel-create"
                className="bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Creating…' : 'Create hotel'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListHotelPage;
