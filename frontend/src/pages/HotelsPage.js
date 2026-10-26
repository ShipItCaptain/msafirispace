import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import HotelCard from '../components/hotel/HotelCard';
import { useFavorites } from '../contexts/FavoritesContext';
import {
  DiscoveryStickyBar,
  DiscoveryBarField,
  FiltersSheet,
  DiscoveryResultsHeader,
  DiscoveryEmptyState,
  fieldInputClass,
} from '../components/discovery/DiscoveryChrome';

const PROPERTY_TYPES = [
  { value: '', label: 'All types' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'resort', label: 'Resort' },
  { value: 'boutique_hotel', label: 'Boutique hotel' },
  { value: 'business_hotel', label: 'Business hotel' },
  { value: 'luxury_hotel', label: 'Luxury hotel' },
  { value: 'budget_hotel', label: 'Budget hotel' },
  { value: 'bed_and_breakfast', label: 'Bed & breakfast' },
  { value: 'hostel', label: 'Hostel' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'villa', label: 'Villa' },
];

const STAR_OPTIONS = [
  { value: '', label: 'Any' },
  { value: '3', label: '3+' },
  { value: '4', label: '4+' },
  { value: '5', label: '5' },
];

const SORT_OPTIONS = [
  { value: 'featured', label: 'Recommended' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'price', label: 'Price: low to high' },
];

const HotelsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [where, setWhere] = useState(() => searchParams.get('where') || searchParams.get('city') || '');
  const [debouncedWhere, setDebouncedWhere] = useState(() => searchParams.get('where') || searchParams.get('city') || '');
  const [filters, setFilters] = useState({
    city: searchParams.get('city') || '',
    property_type: searchParams.get('property_type') || '',
    min_stars: searchParams.get('min_stars') || '',
  });
  const [sortBy, setSortBy] = useState('featured');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { isHotelFavorite, isHotelFavoriteBusy, toggleHotelFavorite } = useFavorites();

  useEffect(() => {
    const nextWhere = searchParams.get('where') || '';
    const nextCity = searchParams.get('city') || '';
    if (nextWhere || nextCity) {
      setWhere(nextWhere || nextCity);
      setDebouncedWhere(nextWhere || nextCity);
    }
    setFilters((prev) => ({
      ...prev,
      city: nextCity || prev.city,
      property_type: searchParams.get('property_type') || prev.property_type,
      min_stars: searchParams.get('min_stars') || prev.min_stars,
    }));
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedWhere(where.trim()), 300);
    return () => clearTimeout(timer);
  }, [where]);

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = {};
        if (debouncedWhere) params.search = debouncedWhere;
        if (filters.city) params.city = filters.city;
        if (filters.property_type) params.property_type = filters.property_type;
        if (filters.min_stars) params.min_stars = filters.min_stars;
        const response = await api.get('/listings/hotels/', { params });
        setHotels(response.data.results || response.data || []);
      } catch (err) {
        setError('Failed to load hotels');
        console.error('Error fetching hotels:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHotels();
  }, [debouncedWhere, filters]);

  const handleToggleFavorite = async (hotelId) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/hotels' } } });
      return;
    }
    const result = await toggleHotelFavorite(hotelId);
    if (!result.ok) {
      toast.error(result.errorMessage);
      return;
    }
    toast.success(result.isFavorite ? 'Added to favorites' : 'Removed from favorites');
  };

  const sheetFilterCount = [filters.property_type, filters.min_stars, filters.city].filter(Boolean).length;
  const activeCount = sheetFilterCount + (where.trim() ? 1 : 0);

  const clearFilters = () => {
    setFilters({ city: '', property_type: '', min_stars: '' });
    setWhere('');
  };

  const sortedHotels = useMemo(() => {
    const list = [...hotels];
    if (sortBy === 'name') {
      return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    if (sortBy === 'rating') {
      return list.sort(
        (a, b) =>
          Number(b.average_rating ?? b.star_rating ?? 0) -
          Number(a.average_rating ?? a.star_rating ?? 0)
      );
    }
    if (sortBy === 'price') {
      return list.sort(
        (a, b) =>
          Number(a.starting_price ?? a.price_per_night ?? a.min_price ?? Infinity) -
          Number(b.starting_price ?? b.price_per_night ?? b.min_price ?? Infinity)
      );
    }
    return list;
  }, [hotels, sortBy]);

  const placeLabel = filters.city || (debouncedWhere ? `“${debouncedWhere}”` : null);

  return (
    <div className="min-h-screen bg-gray-50 pt-14 lg:pt-20">
      <DiscoveryStickyBar
        where={where}
        onWhereChange={setWhere}
        wherePlaceholder="Search hotels or destinations"
        filterCount={sheetFilterCount}
        onOpenFilters={() => setFiltersOpen(true)}
        onClear={clearFilters}
        showClear={activeCount > 0}
      >
        <DiscoveryBarField label="City" className="border-t lg:border-t-0 border-gray-200">
          <input
            type="text"
            value={filters.city}
            onChange={(e) => setFilters((prev) => ({ ...prev, city: e.target.value }))}
            placeholder="Any city"
            className={fieldInputClass}
          />
        </DiscoveryBarField>
      </DiscoveryStickyBar>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <DiscoveryResultsHeader
          countLabel={
            loading
              ? 'Loading hotels…'
              : `${sortedHotels.length} hotel${sortedHotels.length === 1 ? '' : 's'}`
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
            title="Couldn’t load hotels"
            message={error}
            onClear={() => window.location.reload()}
            clearLabel="Try again"
          />
        ) : sortedHotels.length === 0 ? (
          <DiscoveryEmptyState
            title="No hotels match"
            message="Try another destination or clear your filters."
            onClear={activeCount > 0 ? clearFilters : undefined}
          />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-8">
            {sortedHotels.map((hotel) => (
              <HotelCard
                key={hotel.id}
                hotel={hotel}
                isFavorite={isHotelFavorite(hotel.id)}
                favoriteLoading={isHotelFavoriteBusy(hotel.id)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}
      </div>

      <FiltersSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Hotel filters"
        activeCount={sheetFilterCount}
        onClear={() => setFilters((prev) => ({ ...prev, property_type: '', min_stars: '', city: '' }))}
      >
        <div className="lg:hidden">
          <label className="block text-sm font-medium text-gray-800 mb-2">City</label>
          <input
            type="text"
            value={filters.city}
            onChange={(e) => setFilters((prev) => ({ ...prev, city: e.target.value }))}
            placeholder="Any city"
            className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-2">Property type</label>
          <select
            value={filters.property_type}
            onChange={(e) => setFilters((prev) => ({ ...prev, property_type: e.target.value }))}
            className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500"
          >
            {PROPERTY_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-2">Star rating</label>
          <div className="flex flex-wrap gap-2">
            {STAR_OPTIONS.map((option) => (
              <button
                key={option.value || 'any'}
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, min_stars: option.value }))}
                className={`px-3 py-2 text-sm border ${
                  filters.min_stars === option.value
                    ? 'border-red-600 bg-red-50 text-red-700 font-medium'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </FiltersSheet>
    </div>
  );
};

export default HotelsPage;
