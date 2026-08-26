import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  HomeModernIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { bnbAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import BnBCard from '../components/bnb/BnBCard';
import { useFavorites } from '../contexts/FavoritesContext';

const DEFAULT_FILTERS = {
  city: '',
  property_type: '',
  check_in: '',
  check_out: '',
  guests: '',
  min_price: '',
  max_price: '',
  amenities: [],
};

const propertyTypeOptions = [
  { value: '', label: 'All Types' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'villa', label: 'Villa' },
  { value: 'studio', label: 'Studio' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'cottage', label: 'Cottage' },
];

const amenityOptions = [
  'WiFi', 'Kitchen', 'Air conditioning', 'Free parking', 'Pool', 'Washer',
  'TV', 'Hot tub', 'Gym', 'Balcony',
];

const hasActiveFilters = (filters) =>
  Boolean(
    filters.city ||
      filters.property_type ||
      filters.check_in ||
      filters.check_out ||
      filters.guests ||
      filters.min_price ||
      filters.max_price ||
      filters.amenities.length > 0
  );

const BnBsPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { isBnBFavorite, isBnBFavoriteBusy, toggleBnBFavorite } = useFavorites();

  useEffect(() => {
    const fetchBnBs = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await bnbAPI.getListings();
        const data = response?.results || response || [];
        setListings(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load BnB listings:', err);
        setError('Failed to load BnB listings. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchBnBs();
  }, []);

  const handleToggleFavorite = async (listingId) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/bnbs' } } });
      return;
    }
    const result = await toggleBnBFavorite(listingId);
    if (!result.ok) {
      toast.error(result.errorMessage);
      return;
    }
    toast.success(result.isFavorite ? 'Added to favorites' : 'Removed from favorites');
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const toggleAmenity = (amenity) => {
    setFilters((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const runSearch = async (e) => {
    if (e) e.preventDefault();

    if (filters.check_in && filters.check_out && filters.check_in >= filters.check_out) {
      toast.error('Check-out date must be after check-in date');
      return;
    }

    if (!hasActiveFilters(filters)) {
      // No server-side filters applied — just reload the default listing set.
      setSearching(true);
      setError(null);
      try {
        const response = await bnbAPI.getListings();
        const data = response?.results || response || [];
        setListings(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load BnB listings:', err);
        setError('Failed to load BnB listings. Please try again later.');
      } finally {
        setSearching(false);
      }
      return;
    }

    setSearching(true);
    setError(null);
    try {
      const params = {};
      if (filters.city) params.city = filters.city;
      if (filters.property_type) params.property_type = filters.property_type;
      if (filters.check_in) params.check_in = filters.check_in;
      if (filters.check_out) params.check_out = filters.check_out;
      if (filters.guests) params.guests = filters.guests;
      if (filters.min_price) params.min_price = filters.min_price;
      if (filters.max_price) params.max_price = filters.max_price;
      if (filters.amenities.length > 0) params.amenities = filters.amenities;

      const response = await bnbAPI.search(params);
      const data = response?.results || response || [];
      setListings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to search BnB listings:', err);
      const message = err?.response?.data?.error || 'Search failed. Please adjust your filters and try again.';
      setError(message);
    } finally {
      setSearching(false);
    }
  };

  const clearFilters = async () => {
    setFilters(DEFAULT_FILTERS);
    setSearchQuery('');
    setSearching(true);
    setError(null);
    try {
      const response = await bnbAPI.getListings();
      const data = response?.results || response || [];
      setListings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load BnB listings:', err);
      setError('Failed to load BnB listings. Please try again later.');
    } finally {
      setSearching(false);
    }
  };

  const filteredListings = useMemo(() => {
    if (!searchQuery) return listings;
    return listings.filter((listing) => {
      return (
        listing.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [listings, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading BnB stays...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center space-x-3 mb-4">
            <HomeModernIcon className="w-8 h-8 text-red-600" />
            <h1 className="text-3xl font-bold text-gray-900">BnB Stays</h1>
          </div>
          <p className="text-lg text-gray-600">
            Unique homes, cozy apartments, and local stays across East Africa
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-white rounded-xl shadow-lg p-6 mb-8"
        >
          <form onSubmit={runSearch}>
            <div className="relative mb-6">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search stays, cities, or experiences..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-lg"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  placeholder="Enter city"
                  value={filters.city}
                  onChange={(e) => handleFilterChange('city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Check-in</label>
                <input
                  type="date"
                  value={filters.check_in}
                  onChange={(e) => handleFilterChange('check_in', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Check-out</label>
                <input
                  type="date"
                  value={filters.check_out}
                  onChange={(e) => handleFilterChange('check_out', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Guests</label>
                <input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={filters.guests}
                  onChange={(e) => handleFilterChange('guests', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700"
            >
              {showAdvanced ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
              {showAdvanced ? 'Hide more filters' : 'More filters (type, price, amenities)'}
            </button>

            {showAdvanced && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Property Type</label>
                    <select
                      value={filters.property_type}
                      onChange={(e) => handleFilterChange('property_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      {propertyTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min Price / Night</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Any"
                      value={filters.min_price}
                      onChange={(e) => handleFilterChange('min_price', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Price / Night</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Any"
                      value={filters.max_price}
                      onChange={(e) => handleFilterChange('max_price', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amenities</label>
                  <div className="flex flex-wrap gap-2">
                    {amenityOptions.map((amenity) => (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => toggleAmenity(amenity)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          filters.amenities.includes(amenity)
                            ? 'bg-red-600 border-red-600 text-white'
                            : 'bg-white border-gray-300 text-gray-700 hover:border-red-400'
                        }`}
                      >
                        {amenity}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                type="submit"
                disabled={searching}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <MagnifyingGlassIcon className="w-5 h-5" />
                {searching ? 'Searching...' : 'Search Stays'}
              </button>
              <button
                type="button"
                onClick={clearFilters}
                disabled={searching}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors inline-flex items-center justify-center space-x-2 disabled:opacity-60"
              >
                <FunnelIcon className="w-5 h-5" />
                <span>Clear Filters</span>
              </button>
            </div>
          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex items-center justify-between mb-6 flex-wrap gap-4"
        >
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {filteredListings.length} stays found
            </h2>
            {searchQuery && (
              <p className="text-gray-600">
                Showing results for “{searchQuery}”
              </p>
            )}
          </div>
        </motion.div>

        {error ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-xl shadow-lg p-12 text-center"
          >
            <HomeModernIcon className="w-12 h-12 mx-auto text-red-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={clearFilters}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Reset & Try Again
            </button>
          </motion.div>
        ) : filteredListings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-xl shadow-lg p-12 text-center"
          >
            <HomeModernIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No stays match your filters</h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your search or clearing the filters to see more options.
            </p>
            <button
              onClick={clearFilters}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Clear Filters
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredListings.map((listing) => (
              <BnBCard
                key={listing.id}
                listing={listing}
                isFavorite={isBnBFavorite(listing.id)}
                favoriteLoading={isBnBFavoriteBusy(listing.id)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default BnBsPage;
