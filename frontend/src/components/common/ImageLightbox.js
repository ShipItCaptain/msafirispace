import React, { useEffect, useCallback } from 'react';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

/**
 * Full-screen photo viewer. `images` accepts either plain URL strings or
 * objects with an `image` field (the shape both hotel and room-type photo
 * arrays come back as from the API).
 */
const ImageLightbox = ({ images, initialIndex = 0, isOpen, onClose, title }) => {
  const [index, setIndex] = React.useState(initialIndex);

  useEffect(() => {
    if (isOpen) setIndex(initialIndex);
  }, [isOpen, initialIndex]);

  const count = images?.length || 0;

  const goNext = useCallback(() => {
    setIndex((prev) => (prev + 1) % count);
  }, [count]);

  const goPrev = useCallback(() => {
    setIndex((prev) => (prev - 1 + count) % count);
  }, [count]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, goNext, goPrev]);

  if (!isOpen || count === 0) return null;

  const getUrl = (img) => (typeof img === 'string' ? img : img?.image);
  const currentImage = images[index];

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex flex-col"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <div className="text-sm font-medium truncate">
          {title} {count > 0 && <span className="text-white/60">· {index + 1} / {count}</span>}
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Close gallery"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
      </div>

      <div
        className="flex-1 flex items-center justify-center relative px-4 pb-4 min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        {count > 1 && (
          <button
            onClick={goPrev}
            className="absolute left-2 sm:left-6 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
            aria-label="Previous photo"
          >
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
        )}
        <img
          src={getUrl(currentImage)}
          alt={typeof currentImage === 'object' ? currentImage?.caption || title : title}
          className="max-w-full max-h-full object-contain rounded-lg"
        />
        {count > 1 && (
          <button
            onClick={goNext}
            className="absolute right-2 sm:right-6 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
            aria-label="Next photo"
          >
            <ChevronRightIcon className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ImageLightbox;
