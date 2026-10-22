import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import { bnbAPI } from '../services/api';
import {
  getBnBListingStatus,
  BNB_STATUS_LABELS,
  BNB_STATUS_STYLES,
  meetsPublishMinimum,
} from '../utils/bnbOptions';
import BasicInfoSection from '../components/bnb-sections/BasicInfoSection';
import LocationSection from '../components/bnb-sections/LocationSection';
import PricingSection from '../components/bnb-sections/PricingSection';
import PropertyDetailsSection from '../components/bnb-sections/PropertyDetailsSection';
import AmenitiesSection from '../components/bnb-sections/AmenitiesSection';
import PhotosSection from '../components/bnb-sections/PhotosSection';
import HouseRulesSection from '../components/bnb-sections/HouseRulesSection';
import ReviewPublishSection from '../components/bnb-sections/ReviewPublishSection';
import {
  ArrowLeftIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

const SECTIONS = [
  { id: 'photos', label: 'Photos' },
  { id: 'basics', label: 'Title & type' },
  { id: 'location', label: 'Location' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'details', label: 'Property details' },
  { id: 'amenities', label: 'Amenities' },
  { id: 'rules', label: 'House rules' },
  { id: 'publish', label: 'Publish' },
];

const REQUIRED_SECTIONS = ['photos', 'basics', 'location', 'pricing'];

const sectionDone = (id, listing) => {
  if (!listing) return false;
  const hasPhoto =
    Boolean(listing.primary_image) ||
    (Array.isArray(listing.images) && listing.images.length > 0);
  switch (id) {
    case 'photos':
      return hasPhoto;
    case 'basics':
      return Boolean(listing.title?.trim());
    case 'location':
      return Boolean(listing.city?.trim());
    case 'pricing':
      return Number(listing.price_per_night) > 0;
    case 'details':
      return Number(listing.bedrooms) > 0 || Number(listing.max_guests) > 0;
    case 'amenities':
      return Array.isArray(listing.amenities) && listing.amenities.length > 0;
    case 'rules':
      return true;
    case 'publish':
      return meetsPublishMinimum(listing) && listing.is_active;
    default:
      return false;
  }
};

const firstIncompleteSection = (listing) => {
  const next = SECTIONS.find((s) => !sectionDone(s.id, listing) && s.id !== 'publish');
  return next?.id || (meetsPublishMinimum(listing) && !listing.is_active ? 'publish' : 'photos');
};

const BnBListingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useNotifications();
  const [listing, setListing] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingPublish, setIsTogglingPublish] = useState(false);
  const [hasLanded, setHasLanded] = useState(Boolean(location.state?.section));
  const [activeSection, setActiveSection] = useState(
    SECTIONS.some((s) => s.id === location.state?.section) ? location.state.section : 'photos'
  );

  useEffect(() => {
    if (location.state?.section && SECTIONS.some((s) => s.id === location.state.section)) {
      setActiveSection(location.state.section);
      setHasLanded(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  useEffect(() => {
    const loadListing = async () => {
      setIsLoading(true);
      try {
        const foundListing = await bnbAPI.getListing(parseInt(id, 10));
        setListing(foundListing);
      } catch (error) {
        showError(
          'Failed to Load Listing',
          error?.response?.data?.detail || 'Could not load the BnB listing. Please try again.',
          7000
        );
        setListing(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) loadListing();
  }, [id, showError]);

  useEffect(() => {
    if (!listing || hasLanded || location.state?.section) return;
    setActiveSection(firstIncompleteSection(listing));
    setHasLanded(true);
  }, [listing, hasLanded, location.state?.section]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await bnbAPI.remove(parseInt(id, 10));
      showSuccess('Listing Deleted', 'The BnB listing has been successfully deleted.', 5000);
      navigate('/host/bnb');
    } catch (error) {
      setIsDeleting(false);
      showError(
        'Delete Failed',
        error?.response?.data?.detail || 'There was an error deleting the listing. Please try again.',
        7000
      );
    }
  };

  const handleTogglePublish = async () => {
    if (!listing) return;
    const goingLive = !listing.is_active;
    if (goingLive && !meetsPublishMinimum(listing)) {
      setActiveSection(firstIncompleteSection(listing));
      showError('Not ready', 'Finish photos, title, city, and price before publishing.', 5000);
      return;
    }
    setIsTogglingPublish(true);
    try {
      const updated = await bnbAPI.update(listing.id, { is_active: goingLive });
      setListing(updated);
      showSuccess(
        goingLive ? 'Listing published' : 'Listing taken offline',
        goingLive
          ? 'Your listing is now visible to guests.'
          : 'Your listing is no longer visible to guests.',
        5000
      );
      if (goingLive) setActiveSection('publish');
    } catch (error) {
      showError('Update Failed', error?.response?.data?.detail || 'Could not update listing.', 6000);
    } finally {
      setIsTogglingPublish(false);
    }
  };

  const completion = useMemo(() => {
    if (!listing) return { done: 0, total: SECTIONS.length, requiredDone: 0, requiredTotal: REQUIRED_SECTIONS.length };
    const done = SECTIONS.filter((s) => sectionDone(s.id, listing)).length;
    const requiredDone = REQUIRED_SECTIONS.filter((idKey) => sectionDone(idKey, listing)).length;
    return {
      done,
      total: SECTIONS.length,
      requiredDone,
      requiredTotal: REQUIRED_SECTIONS.length,
    };
  }, [listing]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Listing Not Found</h1>
          <p className="text-gray-600 mb-6">The listing you're looking for doesn't exist.</p>
          <button
            type="button"
            onClick={() => navigate('/host/bnb')}
            className="bg-red-600 text-white px-6 py-3 font-medium hover:bg-red-700"
          >
            Back to Listings
          </button>
        </div>
      </div>
    );
  }

  const status = getBnBListingStatus(listing);
  const locationLabel = [listing.city, listing.country].filter(Boolean).join(', ');
  const canPublish = meetsPublishMinimum(listing);
  const progressPct = Math.round((completion.done / completion.total) * 100);

  const renderSection = () => {
    switch (activeSection) {
      case 'photos':
        return <PhotosSection listing={listing} onUpdated={setListing} />;
      case 'basics':
        return <BasicInfoSection listing={listing} onUpdated={setListing} />;
      case 'location':
        return <LocationSection listing={listing} onUpdated={setListing} />;
      case 'pricing':
        return <PricingSection listing={listing} onUpdated={setListing} />;
      case 'details':
        return <PropertyDetailsSection listing={listing} onUpdated={setListing} />;
      case 'amenities':
        return <AmenitiesSection listing={listing} onUpdated={setListing} />;
      case 'rules':
        return <HouseRulesSection listing={listing} onUpdated={setListing} />;
      case 'publish':
        return <ReviewPublishSection listing={listing} onUpdated={setListing} />;
      default:
        return null;
    }
  };

  const activeIndex = SECTIONS.findIndex((s) => s.id === activeSection);
  const goNext = () => {
    const remaining = SECTIONS.slice(activeIndex + 1).find((s) => !sectionDone(s.id, listing));
    if (remaining) {
      setActiveSection(remaining.id);
      return;
    }
    if (activeIndex < SECTIONS.length - 1) setActiveSection(SECTIONS[activeIndex + 1].id);
  };
  const goPrev = () => {
    if (activeIndex > 0) setActiveSection(SECTIONS[activeIndex - 1].id);
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16">
      <div className="bg-white border-b border-gray-200 sticky top-16 lg:top-20 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <button
                type="button"
                onClick={() => navigate('/host/bnb')}
                className="mt-0.5 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                aria-label="Back to listings"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-gray-900 truncate">
                    {listing.title || 'Untitled listing'}
                  </h1>
                  <span className={`px-2.5 py-0.5 text-xs font-semibold ${BNB_STATUS_STYLES[status]}`}>
                    {BNB_STATUS_LABELS[status]}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  {completion.done} of {completion.total} sections ready
                  {completion.requiredDone < completion.requiredTotal
                    ? ` · ${completion.requiredTotal - completion.requiredDone} required left`
                    : ''}
                </p>
                <div
                  className="mt-2 h-1 w-40 max-w-full bg-gray-100 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={progressPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Listing readiness"
                >
                  <div className="h-full bg-red-600 transition-all" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
              <Link
                to={`/bnb/${listing.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <EyeIcon className="w-4 h-4" />
                Preview
              </Link>
              {listing.is_active ? (
                <button
                  type="button"
                  onClick={handleTogglePublish}
                  disabled={isTogglingPublish}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {isTogglingPublish ? 'Updating…' : 'Take offline'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleTogglePublish}
                  disabled={isTogglingPublish || !canPublish}
                  title={!canPublish ? 'Finish required sections first' : undefined}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  {isTogglingPublish ? 'Publishing…' : 'Publish'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 border border-red-200 bg-red-50 hover:bg-red-100"
              >
                <TrashIcon className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="lg:hidden mb-4 -mx-1 overflow-x-auto" role="tablist" aria-label="Listing sections">
          <div className="flex gap-2 px-1 pb-1 min-w-max">
            {SECTIONS.map((section, index) => {
              const done = sectionDone(section.id, listing);
              const active = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveSection(section.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border whitespace-nowrap ${
                    active
                      ? 'border-red-600 bg-red-50 text-red-700'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  <span className="text-[10px] text-gray-400">{index + 1}</span>
                  {done && <CheckCircleIcon className="w-3.5 h-3.5 text-green-600" aria-hidden />}
                  {section.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-6">
          <aside className="hidden lg:block">
            <nav className="sticky top-40 bg-white border border-gray-200 p-3" aria-label="Edit listing sections">
              <p className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Edit listing
              </p>
              <ul className="space-y-0.5">
                {SECTIONS.map((section) => {
                  const done = sectionDone(section.id, listing);
                  const active = activeSection === section.id;
                  const required = REQUIRED_SECTIONS.includes(section.id);
                  return (
                    <li key={section.id}>
                      <button
                        type="button"
                        onClick={() => setActiveSection(section.id)}
                        aria-current={active ? 'step' : undefined}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 text-left text-sm ${
                          active
                            ? 'bg-red-50 text-red-700 font-semibold'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            done ? 'bg-green-500' : required ? 'bg-amber-400' : 'bg-gray-300'
                          }`}
                          aria-hidden
                        />
                        <span className="flex-1">{section.label}</span>
                        {!done && required && (
                          <span className="text-[10px] font-medium text-amber-600">Required</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {locationLabel && (
                <div className="mt-4 pt-3 border-t border-gray-100 px-2">
                  <p className="text-[11px] text-gray-400 mb-1">Location</p>
                  <a
                    href={
                      listing.latitude && listing.longitude
                        ? `https://www.google.com/maps?q=${listing.latitude},${listing.longitude}`
                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationLabel)}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    {locationLabel}
                  </a>
                </div>
              )}
            </nav>
          </aside>

          <div>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                {renderSection()}
              </motion.div>
            </AnimatePresence>

            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={goPrev}
                disabled={activeIndex <= 0}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 hover:bg-white disabled:opacity-40"
              >
                Back
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={activeIndex >= SECTIONS.length - 1}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-40"
              >
                {activeIndex >= SECTIONS.length - 1
                  ? 'Done'
                  : SECTIONS.slice(activeIndex + 1).some((s) => !sectionDone(s.id, listing))
                    ? 'Next incomplete'
                    : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white shadow-xl w-full max-w-md"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-listing-title"
            >
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="bg-red-100 p-2 rounded-full">
                    <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 id="delete-listing-title" className="text-lg font-semibold text-gray-900">
                    Delete listing
                  </h3>
                </div>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete &ldquo;{listing.title}&rdquo;? This cannot be undone.
                </p>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BnBListingDetailPage;
