import React, { useState } from 'react';
import Modal from './Modal';

/**
 * Clamps long text to `lines` (line-clamp) with a "Show more" trigger that
 * opens the full text in a Modal — progressive disclosure instead of an
 * inline expand/collapse toggle.
 */
// Rough estimate of characters a `lines`-line paragraph holds at this
// component's typical container width — used only to decide whether
// "Show more" is worth showing, not to measure actual rendered overflow.
const CHARS_PER_LINE_ESTIMATE = 65;

const TruncatedText = ({ text, lines = 4, title = 'Description' }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!text) return null;

  const likelyTruncated = text.length > lines * CHARS_PER_LINE_ESTIMATE;

  return (
    <>
      <p
        className="text-gray-900 leading-relaxed text-sm sm:text-base whitespace-pre-line break-words"
        style={likelyTruncated ? {
          display: '-webkit-box',
          WebkitLineClamp: lines,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        } : undefined}
      >
        {text}
      </p>
      {likelyTruncated && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="mt-2 text-sm font-semibold text-gray-900 underline hover:text-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 rounded"
        >
          Show more
        </button>
      )}

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={title}>
        <p className="text-gray-900 leading-relaxed text-sm sm:text-base whitespace-pre-line break-words">
          {text}
        </p>
      </Modal>
    </>
  );
};

export default TruncatedText;
