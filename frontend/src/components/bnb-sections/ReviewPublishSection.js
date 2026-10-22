import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import { bnbAPI } from '../../services/api';
import { useNotifications } from '../../contexts/NotificationContext';
import { meetsPublishMinimum } from '../../utils/bnbOptions';
import { SectionCard, extractErrorMessage } from './shared';

const ChecklistItem = ({ done, label }) => (
  <div className="flex items-center gap-2 text-sm">
    {done ? (
      <CheckCircleIcon className="w-5 h-5 text-green-600" />
    ) : (
      <XCircleIcon className="w-5 h-5 text-gray-300" />
    )}
    <span className={done ? 'text-gray-700' : 'text-gray-400'}>{label}</span>
  </div>
);

const ReviewPublishSection = ({ listing, onUpdated }) => {
  const { showSuccess, showError } = useNotifications();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justPublished, setJustPublished] = useState(false);

  const hasLocation = Boolean(listing.city?.trim());
  const hasPrice = Number(listing.price_per_night) > 0;
  const hasPhoto = (listing.images || []).length > 0;
  const canPublish = meetsPublishMinimum(listing);
  const guestPath = `/bnb/${listing.id}`;
  const guestUrl = `${window.location.origin}${guestPath}`;

  const handleTogglePublish = async () => {
    setIsSubmitting(true);
    try {
      const goingLive = !listing.is_active;
      const updated = await bnbAPI.update(listing.id, { is_active: goingLive });
      onUpdated(updated);
      if (updated.is_active) {
        setJustPublished(true);
        showSuccess('Listing published', 'Your listing is now visible to guests.', 5000);
      } else {
        setJustPublished(false);
        showSuccess('Listing taken offline', 'Your listing is no longer visible to guests.', 5000);
      }
    } catch (error) {
      showError('Update Failed', extractErrorMessage(error), 6000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(guestUrl);
      showSuccess('Link copied', 'Share it so guests can find your listing.', 4000);
    } catch {
      showError('Could not copy', 'Copy the link from your browser address bar instead.', 5000);
    }
  };

  const priceLabel = listing.price_per_night
    ? `KSh ${Number(listing.price_per_night).toLocaleString()}/night`
    : null;

  return (
    <SectionCard title="Review & Publish" description="Once the basics are covered, publish to make your listing visible to guests.">
      <div className="space-y-2 mb-6">
        <ChecklistItem done={hasLocation} label="City set" />
        <ChecklistItem done={hasPrice} label="Price per night set" />
        <ChecklistItem done={hasPhoto} label="At least one photo added" />
      </div>

      {justPublished && listing.is_active ? (
        <div className="border border-green-200 bg-green-50 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="w-7 h-7 text-green-600 flex-shrink-0" />
            <div>
              <h3 className="text-base font-semibold text-gray-900">Your listing is live</h3>
              <p className="mt-1 text-sm text-gray-600">
                {[listing.title, listing.city, priceLabel].filter(Boolean).join(' · ')}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Manage dates anytime from Availability on your BnB card.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              to={guestPath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 text-white text-sm font-medium hover:bg-red-700"
            >
              <EyeIcon className="w-4 h-4" />
              View listing
            </Link>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50"
            >
              <LinkIcon className="w-4 h-4" />
              Share
            </button>
            <button
              type="button"
              onClick={() => setJustPublished(false)}
              className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-800"
            >
              Done
            </button>
          </div>
        </div>
      ) : listing.is_active ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">This listing is live and visible to guests.</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              to={guestPath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
            >
              <EyeIcon className="w-4 h-4" />
              View listing
            </Link>
            <button
              type="button"
              onClick={handleTogglePublish}
              disabled={isSubmitting}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
            >
              {isSubmitting ? 'Updating...' : 'Take Offline'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap mb-3">
            <Link
              to={guestPath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
            >
              <EyeIcon className="w-4 h-4" />
              View listing
            </Link>
          </div>
          <button
            type="button"
            onClick={handleTogglePublish}
            disabled={isSubmitting || !canPublish}
            className="px-5 py-2.5 bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Publishing...' : 'Publish Listing'}
          </button>
          {!canPublish && (
            <p className="mt-2 text-xs text-gray-500">
              Set a city, price, and at least one photo before publishing.
            </p>
          )}
        </>
      )}
    </SectionCard>
  );
};

export default ReviewPublishSection;
