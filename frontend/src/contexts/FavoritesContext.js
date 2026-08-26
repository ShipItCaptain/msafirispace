import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { listingsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { trackEvent } from '../utils/analytics';

const FavoritesContext = createContext(null);

const toNumber = (value) => Number(value);

export const FavoritesProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [hotelFavoriteIds, setHotelFavoriteIds] = useState(new Set());
  const [bnbFavoriteIds, setBnBFavoriteIds] = useState(new Set());
  const [combinedFavorites, setCombinedFavorites] = useState([]);
  const [busyHotelIds, setBusyHotelIds] = useState(new Set());
  const [busyBnBIds, setBusyBnBIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadFavorites = useCallback(async () => {
    if (!isAuthenticated) {
      setHotelFavoriteIds(new Set());
      setBnBFavoriteIds(new Set());
      setCombinedFavorites([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await listingsAPI.getCombinedFavorites();
      const rows = data?.results || [];
      const hotelIds = rows
        .filter((item) => item?.type === 'hotel')
        .map((item) => toNumber(item?.hotel?.id || item?.hotel_id))
        .filter(Boolean);
      const bnbIds = rows
        .filter((item) => item?.type === 'bnb')
        .map((item) => toNumber(item?.bnb_listing?.id || item?.bnb_listing_id))
        .filter(Boolean);

      setCombinedFavorites(rows);
      setHotelFavoriteIds(new Set(hotelIds));
      setBnBFavoriteIds(new Set(bnbIds));
    } catch (err) {
      setError('Failed to load favorites.');
      trackEvent('favorite_load_failed', {
        reason: err?.response?.status || 'unknown',
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const upsertCombinedFavorite = useCallback((type, favoriteObj) => {
    setCombinedFavorites((prev) => {
      const filtered = prev.filter((item) => !(item.type === type && item.id === favoriteObj.id));
      return [{ ...favoriteObj, type }, ...filtered];
    });
  }, []);

  const removeCombinedFavorite = useCallback((type, listingId) => {
    setCombinedFavorites((prev) =>
      prev.filter((item) => {
        if (item.type !== type) return true;
        if (type === 'hotel') {
          return toNumber(item?.hotel?.id || item?.hotel_id) !== toNumber(listingId);
        }
        return toNumber(item?.bnb_listing?.id || item?.bnb_listing_id) !== toNumber(listingId);
      })
    );
  }, []);

  const toggleHotelFavorite = useCallback(async (hotelId) => {
    const id = toNumber(hotelId);
    if (!isAuthenticated || !id) {
      return { ok: false, errorMessage: 'Please sign in to save favorites.' };
    }

    if (busyHotelIds.has(id)) {
      return { ok: false, errorMessage: 'Favorite update already in progress.' };
    }
    const wasFavorite = hotelFavoriteIds.has(id);

    setBusyHotelIds((prev) => new Set(prev).add(id));
    setHotelFavoriteIds((prev) => {
      const next = new Set(prev);
      if (wasFavorite) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

    if (wasFavorite) {
      removeCombinedFavorite('hotel', id);
    }

    try {
      if (wasFavorite) {
        await listingsAPI.removeFavorite(id);
        trackEvent('favorite_removed', { listing_type: 'hotel', listing_id: id });
      } else {
        const favorite = await listingsAPI.addFavorite(id);
        if (favorite?.id) {
          upsertCombinedFavorite('hotel', favorite);
        } else {
          await loadFavorites();
        }
        trackEvent('favorite_added', { listing_type: 'hotel', listing_id: id });
      }
      return { ok: true, isFavorite: !wasFavorite };
    } catch (err) {
      setHotelFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) {
          next.add(id);
        } else {
          next.delete(id);
        }
        return next;
      });

      if (wasFavorite) {
        await loadFavorites();
      }

      const errorMessage = err?.response?.data?.detail || 'Failed to update favorite. Please try again.';
      return { ok: false, errorMessage };
    } finally {
      setBusyHotelIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [busyHotelIds, hotelFavoriteIds, isAuthenticated, loadFavorites, removeCombinedFavorite, upsertCombinedFavorite]);

  const toggleBnBFavorite = useCallback(async (bnbListingId) => {
    const id = toNumber(bnbListingId);
    if (!isAuthenticated || !id) {
      return { ok: false, errorMessage: 'Please sign in to save favorites.' };
    }

    if (busyBnBIds.has(id)) {
      return { ok: false, errorMessage: 'Favorite update already in progress.' };
    }
    const wasFavorite = bnbFavoriteIds.has(id);

    setBusyBnBIds((prev) => new Set(prev).add(id));
    setBnBFavoriteIds((prev) => {
      const next = new Set(prev);
      if (wasFavorite) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

    if (wasFavorite) {
      removeCombinedFavorite('bnb', id);
    }

    try {
      if (wasFavorite) {
        await listingsAPI.removeBnBFavorite(id);
        trackEvent('favorite_removed', { listing_type: 'bnb', listing_id: id });
      } else {
        const favorite = await listingsAPI.addBnBFavorite(id);
        if (favorite?.id) {
          upsertCombinedFavorite('bnb', favorite);
        } else {
          await loadFavorites();
        }
        trackEvent('favorite_added', { listing_type: 'bnb', listing_id: id });
      }
      return { ok: true, isFavorite: !wasFavorite };
    } catch (err) {
      setBnBFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) {
          next.add(id);
        } else {
          next.delete(id);
        }
        return next;
      });

      if (wasFavorite) {
        await loadFavorites();
      }

      const errorMessage = err?.response?.data?.detail || 'Failed to update favorite. Please try again.';
      return { ok: false, errorMessage };
    } finally {
      setBusyBnBIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [bnbFavoriteIds, busyBnBIds, isAuthenticated, loadFavorites, removeCombinedFavorite, upsertCombinedFavorite]);

  const value = useMemo(() => ({
    hotelFavoriteIds,
    bnbFavoriteIds,
    combinedFavorites,
    busyHotelIds,
    busyBnBIds,
    loading,
    error,
    refreshFavorites: loadFavorites,
    toggleHotelFavorite,
    toggleBnBFavorite,
    isHotelFavorite: (id) => hotelFavoriteIds.has(toNumber(id)),
    isBnBFavorite: (id) => bnbFavoriteIds.has(toNumber(id)),
    isHotelFavoriteBusy: (id) => busyHotelIds.has(toNumber(id)),
    isBnBFavoriteBusy: (id) => busyBnBIds.has(toNumber(id)),
  }), [
    hotelFavoriteIds,
    bnbFavoriteIds,
    combinedFavorites,
    busyHotelIds,
    busyBnBIds,
    loading,
    error,
    loadFavorites,
    toggleHotelFavorite,
    toggleBnBFavorite,
  ]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};
