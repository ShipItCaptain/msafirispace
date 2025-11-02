import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BuildingOfficeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  MapPinIcon,
  StarIcon,
  CalendarIcon,
  UsersIcon,
  HomeIcon as BedIcon,
  WifiIcon as BathroomIcon,
  WifiIcon,
  TruckIcon,
  CakeIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PhotoIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

const HotelHostManagementPage = () => {
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingHotel, setEditingHotel] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Basic Information
    name: '',
    description: '',
    short_description: '',
    property_type: 'hotel',
    star_rating: 3,
    
    // Step 2: Location
    address: '',
    city: '',
    state_province: '',
    country: 'Kenya',
    postal_code: '',
    latitude: '',
    longitude: '',
    
    // Step 3: Contact & Details
    phone: '',
    email: '',
    website: '',
    total_rooms: '',
    check_in_time: '14:00',
    check_out_time: '11:00',
    
    // Step 4: Pricing & Policies
    base_price: '',
    cancellation_policy: 'flexible',
    house_rules: '',
    
    // Step 5: Amenities & Images
    amenities: [],
    images: []
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form configuration
  const steps = [
    { number: 1, title: 'Basic Information', description: 'Tell us about your hotel' },
    { number: 2, title: 'Location', description: 'Where is your hotel located?' },
    { number: 3, title: 'Contact & Details', description: 'Contact info and room details' },
    { number: 4, title: 'Pricing & Policies', description: 'Set your rates and rules' },
    { number: 5, title: 'Amenities & Images', description: 'Add features and photos' }
  ];

  const propertyTypes = [
    { value: 'hotel', label: 'Hotel' },
    { value: 'resort', label: 'Resort' },
    { value: 'boutique_hotel', label: 'Boutique Hotel' },
    { value: 'business_hotel', label: 'Business Hotel' },
    { value: 'luxury_hotel', label: 'Luxury Hotel' },
    { value: 'budget_hotel', label: 'Budget Hotel' },
    { value: 'bed_and_breakfast', label: 'Bed & Breakfast' },
    { value: 'hostel', label: 'Hostel' }
  ];

  const availableAmenities = [
    { id: 'wifi', name: 'Free WiFi', icon: WifiIcon },
    { id: 'parking', name: 'Free Parking', icon: TruckIcon },
    { id: 'restaurant', name: 'Restaurant', icon: CakeIcon },
    { id: 'pool', name: 'Swimming Pool', icon: '🏊' },
    { id: 'spa', name: 'Spa & Wellness', icon: '🧘' },
    { id: 'gym', name: 'Fitness Center', icon: '💪' },
    
    { id: 'room_service', name: 'Room Service', icon: '🍽️' },
    { id: 'laundry', name: 'Laundry Service', icon: '👕' },
    { id: 'business_center', name: 'Business Center', icon: '💼' },
    { id: 'airport_shuttle', name: 'Airport Shuttle', icon: '🚌' },
    { id: 'pet_friendly', name: 'Pet Friendly', icon: '🐕' }
  ];

  const cancellationPolicies = [
    { value: 'flexible', label: 'Flexible - Free cancellation up to 24 hours before check-in' },
    { value: 'moderate', label: 'Moderate - Free cancellation up to 5 days before check-in' },
    { value: 'strict', label: 'Strict - Free cancellation up to 7 days before check-in' },
    { value: 'super_strict', label: 'Super Strict - No refunds' }
  ];

  // Mock data for demonstration
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setListings([
        {
          id: 1,
          name: "Grand Nairobi Hotel",
          location: "Nairobi, Kenya",
          price: 250,
          rating: 4.7,
          reviews: 156,
          guests: 2,
          rooms: 120,
          bathrooms: 1,
          image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400",
          status: "active",
          bookings: 45,
          amenities: ["WiFi", "Parking", "Restaurant", "Pool", "Spa"]
        },
        {
          id: 2,
          name: "Mombasa Beach Resort",
          location: "Mombasa, Kenya",
          price: 300,
          rating: 4.9,
          reviews: 89,
          guests: 4,
          rooms: 80,
          bathrooms: 2,
          image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400",
          status: "active",
          bookings: 32,
          amenities: ["WiFi", "Parking", "Restaurant", "Pool", "Beach Access"]
        }
      ]);
      setIsLoading(false);
    }, 1000);
  }, []);

  // Form handling functions
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleAmenityToggle = (amenityId) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter(id => id !== amenityId)
        : [...prev.amenities, amenityId]
    }));
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    switch (step) {
      case 1:
        if (!formData.name.trim()) newErrors.name = 'Hotel name is required';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        if (!formData.short_description.trim()) newErrors.short_description = 'Short description is required';
        break;
      case 2:
        if (!formData.address.trim()) newErrors.address = 'Address is required';
        if (!formData.city.trim()) newErrors.city = 'City is required';
        if (!formData.country.trim()) newErrors.country = 'Country is required';
        break;
      case 3:
        if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        if (!formData.total_rooms.trim()) newErrors.total_rooms = 'Total rooms is required';
        break;
      case 4:
        if (!formData.base_price.trim()) newErrors.base_price = 'Base price is required';
        break;
      default:
        // No validation for step 5 (amenities and images)
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newHotel = {
        id: Date.now(), // In real app, this would come from API
        ...formData,
        location: `${formData.city}, ${formData.country}`,
        price: parseInt(formData.base_price),
        rating: 0,
        reviews: 0,
        guests: 2,
        rooms: parseInt(formData.total_rooms),
        bathrooms: 1,
        image: formData.images[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400",
        status: "active",
        bookings: 0
      };
      
      if (editingHotel) {
        setListings(prev => prev.map(hotel => 
          hotel.id === editingHotel.id ? { ...hotel, ...newHotel } : hotel
        ));
      } else {
        setListings(prev => [...prev, newHotel]);
      }
      
      // Reset form
      setShowAddForm(false);
      setEditingHotel(null);
      setCurrentStep(1);
      setFormData({
        name: '',
        description: '',
        short_description: '',
        property_type: 'hotel',
        star_rating: 3,
        address: '',
        city: '',
        state_province: '',
        country: 'Kenya',
        postal_code: '',
        latitude: '',
        longitude: '',
        phone: '',
        email: '',
        website: '',
        total_rooms: '',
        check_in_time: '14:00',
        check_out_time: '11:00',
        base_price: '',
        cancellation_policy: 'flexible',
        house_rules: '',
        amenities: [],
        images: []
      });
      setErrors({});
      
    } catch (error) {
      console.error('Error submitting hotel:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddListing = () => {
    setEditingHotel(null);
    setShowAddForm(true);
    setCurrentStep(1);
    setFormData({
      name: '',
      description: '',
      short_description: '',
      property_type: 'hotel',
      star_rating: 3,
      address: '',
      city: '',
      state_province: '',
      country: 'Kenya',
      postal_code: '',
      latitude: '',
      longitude: '',
      phone: '',
      email: '',
      website: '',
      total_rooms: '',
      check_in_time: '14:00',
      check_out_time: '11:00',
      base_price: '',
      cancellation_policy: 'flexible',
      house_rules: '',
      amenities: [],
      images: []
    });
    setErrors({});
  };

  const handleEditListing = (id) => {
    const hotel = listings.find(h => h.id === id);
    if (hotel) {
      setEditingHotel(hotel);
      setFormData({
        name: hotel.name,
        description: hotel.description || '',
        short_description: hotel.short_description || '',
        property_type: hotel.property_type || 'hotel',
        star_rating: hotel.star_rating || 3,
        address: hotel.address || '',
        city: hotel.city || '',
        state_province: hotel.state_province || '',
        country: hotel.country || 'Kenya',
        postal_code: hotel.postal_code || '',
        latitude: hotel.latitude || '',
        longitude: hotel.longitude || '',
        phone: hotel.phone || '',
        email: hotel.email || '',
        website: hotel.website || '',
        total_rooms: hotel.total_rooms || hotel.rooms || '',
        check_in_time: hotel.check_in_time || '14:00',
        check_out_time: hotel.check_out_time || '11:00',
        base_price: hotel.base_price || hotel.price || '',
        cancellation_policy: hotel.cancellation_policy || 'flexible',
        house_rules: hotel.house_rules || '',
        amenities: hotel.amenities || [],
        images: hotel.images || []
      });
      setShowAddForm(true);
      setCurrentStep(1);
      setErrors({});
    }
  };

  const handleDeleteListing = (id) => {
    if (window.confirm('Are you sure you want to delete this hotel?')) {
      setListings(listings.filter(listing => listing.id !== id));
    }
  };

  const handleViewListing = (id) => {
    console.log('View listing:', id);
    // In a real app, this would navigate to the hotel detail page
  };

  const closeForm = () => {
    setShowAddForm(false);
    setEditingHotel(null);
    setCurrentStep(1);
    setErrors({});
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your hotel listings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Manage Your Hotels</h1>
              <p className="mt-2 text-gray-600">Create, edit, and manage your hotel and restaurant listings</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAddListing}
              className="inline-flex items-center px-6 py-3 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors duration-200 shadow-sm"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add New Hotel
            </motion.button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BuildingOfficeIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Hotels</p>
                <p className="text-2xl font-bold text-gray-900">{listings.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <BedIcon className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Rooms</p>
                <p className="text-2xl font-bold text-gray-900">
                  {listings.reduce((sum, listing) => sum + listing.rooms, 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <CalendarIcon className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900">
                  {listings.reduce((sum, listing) => sum + listing.bookings, 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <StarIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Rating</p>
                <p className="text-2xl font-bold text-gray-900">
                  {listings.length > 0 ? (listings.reduce((sum, listing) => sum + listing.rating, 0) / listings.length).toFixed(1) : '0.0'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Your Hotel Listings</h2>
          </div>
          
          {listings.length === 0 ? (
            <div className="text-center py-12">
              <BuildingOfficeIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hotel listings yet</h3>
              <p className="text-gray-600 mb-6">Get started by adding your first hotel listing</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAddListing}
                className="inline-flex items-center px-6 py-3 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors duration-200"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add Your First Hotel
              </motion.button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {listings.map((listing) => (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200"
                >
                  <div className="relative">
                    <img
                      src={listing.image}
                      alt={listing.name}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-3 right-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        listing.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {listing.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{listing.name}</h3>
                    
                    <div className="flex items-center text-gray-600 mb-2">
                      <MapPinIcon className="w-4 h-4 mr-1" />
                      <span className="text-sm">{listing.location}</span>
                    </div>
                    
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <StarIcon className="w-4 h-4 text-yellow-400 mr-1" />
                        <span className="text-sm font-medium">{listing.rating}</span>
                        <span className="text-sm text-gray-500 ml-1">({listing.reviews} reviews)</span>
                      </div>
                      <div className="text-lg font-bold text-primary-600">${listing.price}/night</div>
                    </div>
                    
                    <div className="flex items-center text-gray-600 text-sm mb-3">
                      <BedIcon className="w-4 h-4 mr-1" />
                      <span className="mr-4">{listing.rooms} rooms</span>
                      <UsersIcon className="w-4 h-4 mr-1" />
                      <span className="mr-4">{listing.guests} guests</span>
                      <BathroomIcon className="w-4 h-4 mr-1" />
                      <span>{listing.bathrooms} bathrooms</span>
                    </div>
                    
                    {/* Amenities */}
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {listing.amenities.slice(0, 3).map((amenity, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            {amenity}
                          </span>
                        ))}
                        {listing.amenities.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            +{listing.amenities.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleViewListing(listing.id)}
                        className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                      >
                        <EyeIcon className="w-4 h-4 mr-1" />
                        View
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleEditListing(listing.id)}
                        className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors duration-200"
                      >
                        <PencilIcon className="w-4 h-4 mr-1" />
                        Edit
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDeleteListing(listing.id)}
                        className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors duration-200"
                      >
                        <TrashIcon className="w-4 h-4 mr-1" />
                        Delete
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Multi-Step Form Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Form Header */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {editingHotel ? 'Edit Hotel' : 'Add New Hotel'}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Step {currentStep} of {steps.length}: {steps[currentStep - 1].title}
                    </p>
                  </div>
                  <button
                    onClick={closeForm}
                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center space-x-2">
                    {steps.map((step, index) => (
                      <div key={step.number} className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          index + 1 <= currentStep
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {index + 1 < currentStep ? (
                            <CheckIcon className="w-5 h-5" />
                          ) : (
                            step.number
                          )}
                        </div>
                        {index < steps.length - 1 && (
                          <div className={`w-12 h-1 mx-2 ${
                            index + 1 < currentStep ? 'bg-primary-500' : 'bg-gray-200'
                          }`} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {currentStep === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hotel Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                          errors.name ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter hotel name"
                      />
                      {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Property Type
                      </label>
                      <select
                        value={formData.property_type}
                        onChange={(e) => handleInputChange('property_type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        {propertyTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Star Rating
                      </label>
                      <div className="flex space-x-2">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleInputChange('star_rating', star)}
                            className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                              star <= formData.star_rating
                                ? 'border-yellow-400 bg-yellow-100 text-yellow-600'
                                : 'border-gray-300 text-gray-400'
                            }`}
                          >
                            <StarIcon className="w-5 h-5" />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Short Description *
                      </label>
                      <input
                        type="text"
                        value={formData.short_description}
                        onChange={(e) => handleInputChange('short_description', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                          errors.short_description ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Brief description (max 100 characters)"
                        maxLength={100}
                      />
                      {errors.short_description && <p className="text-red-500 text-sm mt-1">{errors.short_description}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Description *
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        rows={4}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                          errors.description ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Detailed description of your hotel"
                      />
                      {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                    </div>
                  </motion.div>
                )}

                {currentStep === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <h3 className="text-lg font-semibold text-gray-900">Location Details</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Street Address *
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                          errors.address ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter street address"
                      />
                      {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          City *
                        </label>
                        <input
                          type="text"
                          value={formData.city}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                            errors.city ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter city"
                        />
                        {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          State/Province
                        </label>
                        <input
                          type="text"
                          value={formData.state_province}
                          onChange={(e) => handleInputChange('state_province', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Enter state or province"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Country *
                        </label>
                        <input
                          type="text"
                          value={formData.country}
                          onChange={(e) => handleInputChange('country', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                            errors.country ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter country"
                        />
                        {errors.country && <p className="text-red-500 text-sm mt-1">{errors.country}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Postal Code
                        </label>
                        <input
                          type="text"
                          value={formData.postal_code}
                          onChange={(e) => handleInputChange('postal_code', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Enter postal code"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {currentStep === 3 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <h3 className="text-lg font-semibold text-gray-900">Contact & Details</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                            errors.phone ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="+254 700 000 000"
                        />
                        {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                            errors.email ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="hotel@example.com"
                        />
                        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Website
                      </label>
                      <input
                        type="url"
                        value={formData.website}
                        onChange={(e) => handleInputChange('website', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="https://www.hotelwebsite.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Total Rooms *
                      </label>
                      <input
                        type="number"
                        value={formData.total_rooms}
                        onChange={(e) => handleInputChange('total_rooms', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                          errors.total_rooms ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter total number of rooms"
                        min="1"
                      />
                      {errors.total_rooms && <p className="text-red-500 text-sm mt-1">{errors.total_rooms}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Check-in Time
                        </label>
                        <input
                          type="time"
                          value={formData.check_in_time}
                          onChange={(e) => handleInputChange('check_in_time', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Check-out Time
                        </label>
                        <input
                          type="time"
                          value={formData.check_out_time}
                          onChange={(e) => handleInputChange('check_out_time', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {currentStep === 4 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <h3 className="text-lg font-semibold text-gray-900">Pricing & Policies</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Base Price per Night (USD) *
                      </label>
                      <input
                        type="number"
                        value={formData.base_price}
                        onChange={(e) => handleInputChange('base_price', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                          errors.base_price ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter base price per night"
                        min="0"
                      />
                      {errors.base_price && <p className="text-red-500 text-sm mt-1">{errors.base_price}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cancellation Policy
                      </label>
                      <select
                        value={formData.cancellation_policy}
                        onChange={(e) => handleInputChange('cancellation_policy', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        {cancellationPolicies.map(policy => (
                          <option key={policy.value} value={policy.value}>
                            {policy.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        House Rules
                      </label>
                      <textarea
                        value={formData.house_rules}
                        onChange={(e) => handleInputChange('house_rules', e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Enter house rules and policies"
                      />
                    </div>
                  </motion.div>
                )}

                {currentStep === 5 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <h3 className="text-lg font-semibold text-gray-900">Amenities & Images</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Select Amenities
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {availableAmenities.map(amenity => (
                          <button
                            key={amenity.id}
                            type="button"
                            onClick={() => handleAmenityToggle(amenity.id)}
                            className={`p-3 rounded-lg border-2 text-left transition-colors duration-200 ${
                              formData.amenities.includes(amenity.id)
                                ? 'border-primary-500 bg-primary-50 text-primary-700'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              {typeof amenity.icon === 'string' ? (
                                <span className="text-lg">{amenity.icon}</span>
                              ) : (
                                <amenity.icon className="w-5 h-5" />
                              )}
                              <span className="text-sm font-medium">{amenity.name}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hotel Images
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <PhotoIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">Upload hotel images</p>
                        <p className="text-sm text-gray-500">Drag and drop images here or click to browse</p>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          id="hotel-images"
                        />
                        <label
                          htmlFor="hotel-images"
                          className="mt-4 inline-flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 cursor-pointer transition-colors duration-200"
                        >
                          <PhotoIcon className="w-4 h-4 mr-2" />
                          Choose Images
                        </label>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Form Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    currentStep === 1
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  <ChevronLeftIcon className="w-4 h-4 inline mr-1" />
                  Previous
                </button>

                <div className="flex space-x-3">
                  <button
                    onClick={closeForm}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  
                  {currentStep === steps.length ? (
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="px-6 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      {isSubmitting ? 'Saving...' : editingHotel ? 'Update Hotel' : 'Create Hotel'}
                    </button>
                  ) : (
                    <button
                      onClick={nextStep}
                      className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors duration-200"
                    >
                      Next
                      <ChevronRightIcon className="w-4 h-4 inline ml-1" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HotelHostManagementPage;
