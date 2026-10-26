import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  MapPinIcon,
  StarIcon,
  PhotoIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { listingsAPI } from '../services/api';

// Ongoing management for a host's hotel -- specifically the photos and
// amenities that the onboarding wizard deliberately kept light (a handful
// of photos, no amenities at all) so the wizard itself stays quick. This
// page is where a host expands on that at their own pace, matching
// Booking.com's pattern of a small required set upfront plus a separate,
// persistent dashboard for everything else.
const HotelHostManagementPage = () => {
  const [hotel, setHotel] = useState(null);
  const [amenityCatalog, setAmenityCatalog] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingAmenityId, setPendingAmenityId] = useState(null);

  const loadHotel = async () => {
    // getUserListings() returns the lightweight list shape (no images or
    // amenity_mappings) -- fetch the full detail for whichever hotel this
    // account has (one-hotel-per-account) so photos/amenities are present.
    const response = await listingsAPI.getUserListings();
    const hotels = response?.results || response || [];
    if (!hotels[0]) {
      setHotel(null);
      return;
    }
    const detail = await listingsAPI.getListing(hotels[0].id);
    setHotel(detail);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [, amenities] = await Promise.all([
          loadHotel(),
          listingsAPI.getHotelAmenities(),
        ]);
        if (!cancelled) setAmenityCatalog(amenities?.results || amenities || []);
      } catch (error) {
        toast.error('Could not load your hotel');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddPhotos = async (fileList) => {
    if (!hotel || !fileList?.length) return;
    setIsUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        // eslint-disable-next-line no-await-in-loop
        await listingsAPI.uploadHotelImage(hotel.id, { file });
      }
      await loadHotel();
      toast.success('Photos added');
    } catch (error) {
      toast.error('Some photos failed to upload');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async (imageId) => {
    if (!hotel) return;
    try {
      await listingsAPI.deleteHotelImage(hotel.id, imageId);
      setHotel((prev) => ({ ...prev, images: prev.images.filter((img) => img.id !== imageId) }));
    } catch (error) {
      toast.error('Could not remove photo');
    }
  };

  const handleToggleAmenity = async (amenity) => {
    if (!hotel) return;
    const mapping = hotel.amenity_mappings.find((m) => m.amenity.id === amenity.id);
    setPendingAmenityId(amenity.id);
    try {
      if (mapping) {
        await listingsAPI.removeHotelAmenity(hotel.id, mapping.id);
        setHotel((prev) => ({
          ...prev,
          amenity_mappings: prev.amenity_mappings.filter((m) => m.id !== mapping.id),
        }));
        toast.success(`${amenity.name} removed`);
      } else {
        const created = await listingsAPI.addHotelAmenity(hotel.id, amenity.id);
        setHotel((prev) => ({ ...prev, amenity_mappings: [...prev.amenity_mappings, created] }));
        toast.success(`${amenity.name} added`);
      }
    } catch (error) {
      toast.error('Could not update amenity');
    } finally {
      setPendingAmenityId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-14 lg:pt-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" />
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 pt-14 lg:pt-20 text-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-2">No hotel yet</h1>
          <p className="text-gray-500 mb-6">You haven't created a hotel listing on this account.</p>
          <Link to="/become-host" className="inline-block px-6 py-3 bg-red-600 text-white font-medium">
            Become a host
          </Link>
        </div>
      </div>
    );
  }

  const activeAmenityIds = new Set(hotel.amenity_mappings.map((m) => m.amenity.id));

  return (
    <div className="min-h-screen bg-gray-50 pt-14 lg:pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">{hotel.name}</h1>
          <p className="mt-1 text-sm text-gray-500 flex items-center gap-3">
            <span className="flex items-center gap-1"><MapPinIcon className="w-4 h-4" />{hotel.city}, {hotel.country}</span>
            <span className="flex items-center gap-1"><StarIcon className="w-4 h-4 text-yellow-500" />{hotel.star_rating}</span>
          </p>
        </div>

        <section className="bg-white border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Photos</h2>
          <p className="text-sm text-gray-500 mb-5">Add as many as you'd like -- more photos help guests trust your listing.</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
            {hotel.images.map((image) => (
              <div key={image.id} className="relative">
                <img src={image.image} alt={image.caption || hotel.name} className="w-full h-28 object-cover" />
                <button
                  type="button"
                  onClick={() => handleDeletePhoto(image.id)}
                  className="absolute top-1 right-1 bg-white/90 text-gray-700 w-6 h-6 flex items-center justify-center hover:text-red-600"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <label className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 cursor-pointer hover:border-red-400">
            <PhotoIcon className="w-4 h-4" />
            {isUploading ? 'Uploading...' : 'Add photos'}
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={isUploading}
              onChange={(e) => { handleAddPhotos(e.target.files); e.target.value = ''; }}
              className="hidden"
            />
          </label>
        </section>

        <section className="bg-white border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Amenities</h2>
          <p className="text-sm text-gray-500 mb-5">Select what your property offers.</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {amenityCatalog.map((amenity) => {
              const active = activeAmenityIds.has(amenity.id);
              return (
                <button
                  key={amenity.id}
                  type="button"
                  disabled={pendingAmenityId === amenity.id}
                  onClick={() => handleToggleAmenity(amenity)}
                  className={`px-3 py-2 text-left text-sm border transition-colors disabled:opacity-50 ${
                    active
                      ? 'border-red-600 bg-red-50 text-red-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {amenity.name}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default HotelHostManagementPage;
