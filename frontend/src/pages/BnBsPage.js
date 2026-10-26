import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { bnbAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import BnBCard from '../components/bnb/BnBCard';
import { useFavorites } from '../contexts/FavoritesContext';
import {
  DiscoveryStickyBar,
  DiscoveryBarField,
  FiltersSheet,
  DiscoveryResultsHeader,
  DiscoveryEmptyState,
  fieldInputClass,
} from '../components/discovery/DiscoveryChrome';

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

const PROPERTY_TYPES = [
  { value: '', label: 'All types' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'villa', label: 'Villa' },
  { value: 'studio', label: 'Studio' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'cottage', label: 'Cottage' },
];

const AMENITY_OPTIONS = [
  'WiFi',
  'Kitchen',
  'Air conditioning',
  'Free parking',
  'Pool',
  'Washer',
  'TV',
  'Hot tub',
  'Gym',
  'Balcony',
];

const SORT_OPTIONS = [
  { value: 'featured', label: 'Recommended' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name A–Z' },
];

const hasServerFilters = (filters) =>
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
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [where, setWhere] = useState(() => searchParams.get('where') || '');
  const [filters, setFilters] = useState(() => ({
    ...DEFAULT_FILTERS,
    city: searchParams.get('city') || '',
    check_in: searchParams.get('check_in') || '',
    check_out: searchParams.get('check_out') || '',
    guests: searchParams.get('guests') || '',
    property_type: searchParams.get('property_type') || '',
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || '',
  }));
  const [sortBy, setSortBy] = useState('featured');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { isBnBFavorite, isBnBFavoriteBusy, toggleBnBFavorite } = useFavorites();

  useEffect(() => {
    const nextWhere = searchParams.get('where') || '';
    if (nextWhere) setWhere(nextWhere);
    setFilters((prev) => ({
      ...prev,
      city: searchParams.get('city') || prev.city,
      check_in: searchParams.get('check_in') || prev.check_in,
      check_out: searchParams.get('check_out') || prev.check_out,
      guests: searchParams.get('guests') || prev.guests,
      property_type: searchParams.get('property_type') || prev.property_type,
      min_price: searchParams.get('min_price') || prev.min_price,
      max_price: searchParams.get('max_price') || prev.max_price,
    }));
  }, [searchParams]);

  const loadListings = useCallback(async (nextFilters) => {
    setLoading(true);
    setError(null);
    try {
      if (!hasServerFilters(nextFilters)) {
        const response = await bnbAPI.getListings();
        const data = response?.results || response || [];
        setListings(Array.isArray(data) ? data : []);
        return;
      }
      if (nextFilters.check_in && nextFilters.check_out && nextFilters.check_in >= nextFilters.check_out) {
        toast.error('Check-out must be after check-in');
        setLoading(false);
        return;
      }
      const params = {};
      if (nextFilters.city) params.city = nextFilters.city;
      if (nextFilters.property_type) params.property_type = nextFilters.property_type;
      if (nextFilters.check_in) params.check_in = nextFilters.check_in;
      if (nextFilters.check_out) params.check_out = nextFilters.check_out;
      if (nextFilters.guests) params.guests = nextFilters.guests;
      if (nextFilters.min_price) params.min_price = nextFilters.min_price;
      if (nextFilters.max_price) params.max_price = nextFilters.max_price;
      if (nextFilters.amenities.length > 0) params.amenities = nextFilters.amenities;
      const response = await bnbAPI.search(params);
      const data = response?.results || response || [];
      setListings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load BnB listings:', err);
      setError(err?.response?.data?.error || 'Failed to load stays. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadListings(filters);
    }, 350);
    return () => clearTimeout(timer);
  }, [filters, loadListings]);

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

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  const toggleAmenity = (amenity) => {
    setFilters((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const sheetFilterCount =
    (filters.property_type ? 1 : 0) +
    (filters.min_price || filters.max_price ? 1 : 0) +
    filters.amenities.length +
    (filters.city ? 1 : 0) +
    (filters.check_in || filters.check_out ? 1 : 0) +
    (filters.guests ? 1 : 0);

  const barActive =
    Boolean(where.trim() || filters.city || filters.check_in || filters.check_out || filters.guests) ||
    sheetFilterCount > 0;

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setWhere('');
  };

  const visibleListings = useMemo(() => {
    const query = where.trim().toLowerCase();
    let list = listings;
    if (query) {
      list = list.filter(
        (listing) =>
          listing.title?.toLowerCase().includes(query) ||
          listing.city?.toLowerCase().includes(query) ||
          listing.description?.toLowerCase().includes(query)
      );
    }
    list = [...list];
    if (sortBy === 'name') list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    if (sortBy === 'price_asc') {
      list.sort((a, b) => Number(a.price_per_night || Infinity) - Number(b.price_per_night || Infinity));
    }
    if (sortBy === 'price_desc') {
      list.sort((a, b) => Number(b.price_per_night || 0) - Number(a.price_per_night || 0));
    }
    return list;
  }, [listings, where, sortBy]);

  const placeLabel = filters.city || (where.trim() ? `“${where.trim()}”` : null);

  return (
    <div className="min-h-screen bg-gray-50 pt-14 lg:pt-20">
      <DiscoveryStickyBar
        where={where}
        onWhereChange={setWhere}
        wherePlaceholder="Search stays or destinations"
        filterCount={sheetFilterCount}
        onOpenFilters={() => setFiltersOpen(true)}
        onClear={clearFilters}
        showClear={barActive}
      >
        <DiscoveryBarField label="Check-in" className="border-t lg:border-t-0 border-gray-200">
          <input
            type="date"
            value={filters.check_in}
            onChange={(e) => setFilter('check_in', e.target.value)}
            className={fieldInputClass}
          />
        </DiscoveryBarField>
        <DiscoveryBarField label="Check-out" className="border-t lg:border-t-0 border-gray-200">
          <input
            type="date"
            value={filters.check_out}
            onChange={(e) => setFilter('check_out', e.target.value)}
            className={fieldInputClass}
          />
        </DiscoveryBarField>
        <DiscoveryBarField label="Guests" className="border-t lg:border-t-0 border-gray-200 lg:max-w-[7rem]">
          <input
            type="number"
            min="1"
            value={filters.guests}
            onChange={(e) => setFilter('guests', e.target.value)}
            placeholder="Any"
            className={fieldInputClass}
          />
        </DiscoveryBarField>
      </DiscoveryStickyBar>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <DiscoveryResultsHeader
          countLabel={
            loading
              ? 'Loading stays…'
              : `${visibleListings.length} stay${visibleListings.length === 1 ? '' : 's'}`
          }
          placeLabel={placeLabel}
          sortBy={sortBy}
          onSortChange={setSortBy}
          sortOptions={SORT_OPTIONS}
        />

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-8" aria-busy="true">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="animate-pulse">
                <div className="aspect-[4/3] bg-gray-200" />
                <div className="mt-2 h-4 w-3/4 bg-gray-200" />
                <div className="mt-1 h-3 w-1/2 bg-gray-200" />
                <div className="mt-1 h-3 w-1/3 bg-gray-200" />
              </div>
            ))}
          </div>
        ) : error ? (
          <DiscoveryEmptyState
            title="Couldn’t load stays"
            message={error}
            onClear={clearFilters}
            clearLabel="Reset & try again"
          />
        ) : visibleListings.length === 0 ? (
          <DiscoveryEmptyState
            title="No stays match"
            message="Try different dates, a new destination, or clear filters."
            onClear={barActive ? clearFilters : undefined}
          />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-8">
            {visibleListings.map((listing) => (
              <BnBCard
                key={listing.id}
                listing={listing}
                isFavorite={isBnBFavorite(listing.id)}
                favoriteLoading={isBnBFavoriteBusy(listing.id)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}
      </div>

      <FiltersSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Stay filters"
        activeCount={sheetFilterCount}
        onClear={() =>
          setFilters((prev) => ({
            ...prev,
            property_type: '',
            min_price: '',
            max_price: '',
            amenities: [],
            city: '',
            check_in: '',
            check_out: '',
            guests: '',
          }))
        }
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
          <input
            type="text"
            value={filters.city}
            onChange={(e) => setFilter('city', e.target.value)}
            placeholder="e.g. Nairobi"
            className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500"
          />
        </div>
        <div className="lg:hidden grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Check-in</label>
            <input
              type="date"
              value={filters.check_in}
              onChange={(e) => setFilter('check_in', e.target.value)}
              className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Check-out</label>
            <input
              type="date"
              value={filters.check_out}
              onChange={(e) => setFilter('check_out', e.target.value)}
              className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>
        <div className="lg:hidden">
          <label className="block text-sm font-medium text-gray-700 mb-2">Guests</label>
          <input
            type="number"
            min="1"
            value={filters.guests}
            onChange={(e) => setFilter('guests', e.target.value)}
            placeholder="Any"
            className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Property type</label>
          <select
            value={filters.property_type}
            onChange={(e) => setFilter('property_type', e.target.value)}
            className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500"
          >
            {PROPERTY_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Min price</label>
            <input
              type="number"
              min="0"
              value={filters.min_price}
              onChange={(e) => setFilter('min_price', e.target.value)}
              placeholder="Any"
              className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Max price</label>
            <input
              type="number"
              min="0"
              value={filters.max_price}
              onChange={(e) => setFilter('max_price', e.target.value)}
              placeholder="Any"
              className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Amenities</label>
          <div className="flex flex-wrap gap-2">
            {AMENITY_OPTIONS.map((amenity) => (
              <button
                key={amenity}
                type="button"
                onClick={() => toggleAmenity(amenity)}
                className={`px-3 py-2 text-sm border ${
                  filters.amenities.includes(amenity)
                    ? 'border-red-600 bg-red-50 text-red-700 font-medium'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                {amenity}
              </button>
            ))}
          </div>
        </div>
      </FiltersSheet>
    </div>
  );
};

export default BnBsPage;
