import React from 'react';
import { StarIcon } from '@heroicons/react/24/outline';

const HostDashboardReviewsTab = ({
  reviews,
  reviewReplyDrafts,
  reviewReplyLoadingId,
  onReviewReplyChange,
  onSubmitReviewReply,
  getReplyMetadataLabel,
}) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-gray-900">Guest Reviews</h2>

    <div className="space-y-4">
      {reviews.map((review) => {
        const draft = reviewReplyDrafts[review.id] ?? review.host_reply ?? '';
        const charCount = draft.length;
        return (
          <div key={review.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <h4 className="font-medium text-gray-900 mr-2">{review.guest}</h4>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <StarIcon
                        key={i}
                        className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 mb-2">{review.comment}</p>
                <div className="flex items-center text-sm text-gray-500">
                  <span>{review.hotel}</span>
                  <span className="mx-2">•</span>
                  <span>{review.date}</span>
                </div>
                {review.host_reply ? (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-blue-900">Your reply</p>
                      <p className="text-[11px] text-blue-700">{getReplyMetadataLabel(review)}</p>
                    </div>
                    <p className="text-sm text-blue-900 mt-1">{review.host_reply}</p>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="mt-4 border-t border-gray-100 pt-4">
              <label className="block text-xs font-medium text-gray-600 mb-2">
                {review.host_reply ? 'Update reply' : 'Reply to guest'}
              </label>
              <textarea
                rows={2}
                value={draft}
                onChange={(event) => onReviewReplyChange(review.id, event.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Write a helpful reply to this guest review..."
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className={`text-xs ${charCount > 500 ? 'text-red-600' : 'text-gray-500'}`}>
                  {charCount}/500
                </p>
                <button
                  type="button"
                  onClick={() => onSubmitReviewReply(review)}
                  disabled={reviewReplyLoadingId === review.id || charCount === 0 || charCount > 500}
                  className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  {reviewReplyLoadingId === review.id ? 'Saving...' : (review.host_reply ? 'Update Reply' : 'Post Reply')}
                </button>
              </div>
            </div>
          </div>
        );
      })}
      {!reviews.length && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-sm text-gray-500">
          No reviews yet.
        </div>
      )}
    </div>
  </div>
);

export default HostDashboardReviewsTab;
