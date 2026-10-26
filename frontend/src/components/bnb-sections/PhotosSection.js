import React, { useRef, useState } from 'react';
import { PhotoIcon, TrashIcon, StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { bnbAPI } from '../../services/api';
import { useNotifications } from '../../contexts/NotificationContext';
import { SectionCard, extractErrorMessage } from './shared';

const PhotosSection = ({ listing, onUpdated }) => {
  const { showSuccess, showError } = useNotifications();
  const [isUploading, setIsUploading] = useState(false);
  const [pendingImageId, setPendingImageId] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);
  const images = listing.images || [];

  const handleAddPhotos = async (fileList) => {
    if (!fileList?.length) return;
    setIsUploading(true);
    try {
      let hasPrimary = images.length > 0;
      for (const file of Array.from(fileList)) {
        const shouldBePrimary = !hasPrimary;
        // eslint-disable-next-line no-await-in-loop
        await bnbAPI.uploadImage(listing.id, {
          image: file,
          image_type: 'exterior',
          is_primary: shouldBePrimary,
        });
        if (shouldBePrimary) hasPrimary = true;
      }
      const updated = await bnbAPI.getListing(listing.id);
      onUpdated(updated);
      showSuccess('Photos Added', '', 4000);
    } catch (error) {
      showError('Upload Failed', extractErrorMessage(error), 6000);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async (imageId) => {
    try {
      await bnbAPI.deleteImage(listing.id, imageId);
      onUpdated({ ...listing, images: images.filter((img) => img.id !== imageId) });
    } catch (error) {
      showError('Could not remove photo', extractErrorMessage(error), 6000);
    }
  };

  const handleSetPrimary = async (imageId) => {
    setPendingImageId(imageId);
    try {
      await bnbAPI.updateImage(listing.id, imageId, { is_primary: true });
      const updated = await bnbAPI.getListing(listing.id);
      onUpdated(updated);
    } catch (error) {
      showError('Could not update photo', extractErrorMessage(error), 6000);
    } finally {
      setPendingImageId(null);
    }
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    handleAddPhotos(event.dataTransfer.files);
  };

  return (
    <SectionCard
      title="Photos"
      description="Great photos sell the stay. Add at least one — the first becomes your cover."
    >
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`mb-5 border-2 border-dashed px-6 py-12 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50 hover:border-red-400'
        }`}
        aria-label="Add photos"
      >
        <PhotoIcon className="w-10 h-10 text-gray-500 mx-auto mb-3" aria-hidden />
        <p className="text-sm font-semibold text-gray-900">
          {isUploading ? 'Uploading…' : 'Drag photos here, or click to browse'}
        </p>
        <p className="mt-1 text-xs text-gray-500">JPG or PNG · multiple files ok</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          disabled={isUploading}
          onChange={(e) => {
            handleAddPhotos(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((image, index) => {
            const src = typeof image === 'string' ? image : image?.image;
            return (
              <div key={image.id || src} className={`relative group ${index === 0 ? 'sm:col-span-2 sm:row-span-2' : ''}`}>
                <img
                  src={src}
                  alt={image.caption || `${listing.title || 'Listing'} photo`}
                  className={`w-full object-cover bg-gray-100 ${index === 0 ? 'h-48 sm:h-full min-h-[12rem]' : 'h-28 sm:h-32'}`}
                />
                {image.is_primary && (
                  <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-semibold px-1.5 py-0.5">
                    Cover
                  </span>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleSetPrimary(image.id);
                    }}
                    disabled={pendingImageId === image.id || image.is_primary}
                    title="Set as cover"
                    aria-label="Set as cover photo"
                    className="bg-white text-gray-700 w-8 h-8 flex items-center justify-center hover:text-red-600 disabled:opacity-50"
                  >
                    {image.is_primary ? (
                      <StarSolidIcon className="w-4 h-4 text-red-600" />
                    ) : (
                      <StarIcon className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeletePhoto(image.id);
                    }}
                    title="Remove photo"
                    aria-label="Remove photo"
                    className="bg-white text-gray-700 w-8 h-8 flex items-center justify-center hover:text-red-600"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
};

export default PhotosSection;
