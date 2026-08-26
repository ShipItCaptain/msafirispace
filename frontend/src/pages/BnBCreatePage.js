import React from 'react';
import { useNavigate } from 'react-router-dom';
import { bnbAPI } from '../services/api';
import ComprehensiveBnBForm from '../components/forms/ComprehensiveBnBForm';
import { useNotifications } from '../contexts/NotificationContext';

const BnBCreatePage = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotifications();

  const extractErrorMessage = (error) => {
    const data = error?.response?.data;
    if (!data) return error?.message || 'There was an error creating your listing.';
    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;
    if (data.error) return data.error;
    const firstKey = Object.keys(data)[0];
    if (firstKey && Array.isArray(data[firstKey]) && data[firstKey].length > 0) {
      return `${firstKey}: ${data[firstKey][0]}`;
    }
    if (firstKey && typeof data[firstKey] === 'string') {
      return `${firstKey}: ${data[firstKey]}`;
    }
    return error?.message || 'There was an error creating your listing.';
  };

  const handleSave = async (listingData) => {
    let savedListing = null;
    try {
      const apiData = {
        title: listingData.title || listingData.propertyName || '',
        description: listingData.description || '',
        property_type: listingData.propertyType || 'apartment',
        address: listingData.address || '',
        city: listingData.city || '',
        state_province: listingData.stateProvince || listingData.state || '',
        country: listingData.country || 'Kenya',
        postal_code: listingData.postalCode || '',
        latitude: listingData.latitude ? parseFloat(listingData.latitude) : null,
        longitude: listingData.longitude ? parseFloat(listingData.longitude) : null,
        price_per_night: parseFloat(listingData.pricePerNight || listingData.price || 0),
        cleaning_fee: listingData.cleaningFee ? parseFloat(listingData.cleaningFee) : 0,
        security_deposit: listingData.securityDeposit ? parseFloat(listingData.securityDeposit) : 0,
        currency: listingData.currency || 'KES',
        bedrooms: parseInt(listingData.bedrooms || 1, 10),
        bathrooms: parseInt(listingData.bathrooms || 1, 10),
        beds: parseInt(listingData.beds || 1, 10),
        max_guests: parseInt(listingData.guests || listingData.maxGuests || 2, 10),
        square_footage: listingData.squareFootage ? parseInt(listingData.squareFootage, 10) : null,
        year_built: listingData.yearBuilt ? parseInt(listingData.yearBuilt, 10) : null,
        check_in_time: listingData.checkInTime || '15:00:00',
        check_out_time: listingData.checkOutTime || '11:00:00',
        minimum_nights: parseInt(listingData.minimumNights || 1, 10),
        maximum_nights: parseInt(listingData.maximumNights || 30, 10),
        amenities: Array.isArray(listingData.amenities) ? listingData.amenities : [],
        house_rules: Array.isArray(listingData.houseRules) ? listingData.houseRules : [],
        smoking_allowed: listingData.smokingAllowed || false,
        pets_allowed: listingData.petsAllowed || false,
        parties_allowed: listingData.partiesAllowed || false,
        children_allowed: listingData.childrenAllowed !== undefined ? listingData.childrenAllowed : true,
        highlights: Array.isArray(listingData.highlights) ? listingData.highlights : [],
        transportation: listingData.transportation || '',
        special_instructions: listingData.specialInstructions || '',
        host_name: listingData.hostName || '',
        host_phone: listingData.hostPhone || '',
        host_email: listingData.hostEmail || '',
        emergency_contact: listingData.emergencyContact || '',
        is_active: true,
      };

      savedListing = await bnbAPI.create(apiData);

      if (listingData.photos && listingData.photos.length > 0) {
        const uploadPromises = listingData.photos
          .map((photo, index) => {
            if (photo.isExisting) {
              return null;
            }
            const file = photo.file || (photo instanceof File ? photo : null);
            if (!file || !(file instanceof File)) {
              return null;
            }
            return bnbAPI.uploadImage(savedListing.id, {
              image: file,
              image_type: photo.image_type || 'exterior',
              caption: photo.caption || '',
              is_primary: Boolean(photo.is_primary),
              order: index,
            });
          })
          .filter(Boolean);

        const results = await Promise.allSettled(uploadPromises);
        const failedUploads = results.filter((r) => r.status === 'rejected');
        if (failedUploads.length > 0) {
          showError(
            'Some Images Failed',
            `${failedUploads.length} image(s) failed to upload. Listing was created and can be edited.`,
            7000
          );
        }
      }

      showSuccess('Listing Created', 'Your BnB listing has been successfully created.', 5000);
      navigate('/host/bnb');
    } catch (error) {
      if (savedListing?.id) {
        showError(
          'Listing Created With Issues',
          `Listing was created, but image upload failed: ${extractErrorMessage(error)}`,
          8000
        );
        navigate('/host/bnb');
        return;
      }
      showError(
        'Create Failed',
        extractErrorMessage(error),
        7000
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          <ComprehensiveBnBForm
            onClose={() => navigate('/host/home')}
            onSave={handleSave}
          />
        </div>
      </div>
    </div>
  );
};

export default BnBCreatePage;
