import React, { useEffect, useRef, useState } from 'react';
import { GoogleMap, Marker, Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { MapPinIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const LIBRARIES = ['places'];
const DEFAULT_CENTER = { lat: -1.2921, lng: 36.8219 }; // Nairobi
const inputClasses = 'w-full px-4 py-3 border border-gray-300 rounded-none text-base focus:ring-2 focus:ring-red-500 focus:border-transparent';

const parseAddressComponents = (components = []) => {
  const get = (type) => components.find((c) => c.types.includes(type))?.long_name || '';
  return {
    city: get('locality') || get('administrative_area_level_2') || get('sublocality') || '',
    state_province: get('administrative_area_level_1') || '',
    country: get('country') || '',
    postal_code: get('postal_code') || '',
  };
};

const hasCoords = (value) =>
  value.latitude !== '' && value.longitude !== '' && value.latitude != null && value.longitude != null;

// Django DecimalField(max_digits=9, decimal_places=6) — clip GPS/Nominatim floats.
const roundCoord = (v) => Number(Number(v).toFixed(6));

const MapPreview = ({ lat, lng }) => (
  <div className="h-52 border border-gray-300 overflow-hidden bg-gray-100">
    <iframe
      title="Property location"
      width="100%"
      height="100%"
      style={{ border: 0 }}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      src={`https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`}
    />
  </div>
);

// Address fields + Nominatim search / geolocation when Google Maps isn't configured.
// Lat/lng stay in form state but are never typed by hand.
const ManualLocationFields = ({ value, onChange }) => {
  const [query, setQuery] = useState(value.address || '');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [hint, setHint] = useState('');
  const debounceRef = useRef(null);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const applyPlace = (place) => {
    const lat = roundCoord(place.lat);
    const lng = roundCoord(place.lon);
    onChange({
      address: place.display_name || value.address,
      city: place.address?.city || place.address?.town || place.address?.village || place.address?.county || value.city,
      state_province: place.address?.state || value.state_province,
      country: place.address?.country || value.country || 'Kenya',
      postal_code: place.address?.postcode || value.postal_code,
      latitude: lat,
      longitude: lng,
    });
    setQuery(place.display_name || '');
    setResults([]);
    setHint('Pin set from search — you can refine the address fields below.');
  };

  const searchPlaces = (text) => {
    setQuery(text);
    clearTimeout(debounceRef.current);
    if (!text.trim() || text.trim().length < 3) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(text)}`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setResults([]);
        setHint('Could not search addresses right now. Fill the fields below instead.');
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setHint('Location is not supported in this browser.');
      return;
    }
    setLocating(true);
    setHint('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = roundCoord(pos.coords.latitude);
        const lng = roundCoord(pos.coords.longitude);
        onChange({ latitude: lat, longitude: lng });
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${lat}&lon=${lng}`;
          const res = await fetch(url, { headers: { Accept: 'application/json' } });
          const place = await res.json();
          if (place?.display_name) {
            onChange({
              address: place.display_name,
              city: place.address?.city || place.address?.town || place.address?.village || place.address?.county || '',
              state_province: place.address?.state || '',
              country: place.address?.country || 'Kenya',
              postal_code: place.address?.postcode || '',
              latitude: lat,
              longitude: lng,
            });
            setQuery(place.display_name);
          }
          setHint('Pin set from your current location.');
        } catch {
          setHint('Coordinates set. Fill in the address fields below.');
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setHint('Could not get your location. Allow location access or search for an address.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => searchPlaces(e.target.value)}
          placeholder="Search for your property address..."
          className={`${inputClasses} pl-10`}
          autoComplete="off"
        />
        {searching && (
          <p className="mt-1 text-xs text-gray-500">Searching…</p>
        )}
        {results.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-200 shadow-lg max-h-56 overflow-auto">
            {results.map((place) => (
              <li key={place.place_id}>
                <button
                  type="button"
                  onClick={() => applyPlace(place)}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  {place.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating}
        className="inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
      >
        <MapPinIcon className="h-4 w-4" />
        {locating ? 'Getting location…' : 'Use my current location'}
      </button>

      {hint && <p className="text-xs text-gray-500">{hint}</p>}

      {hasCoords(value) && (
        <MapPreview lat={Number(value.latitude)} lng={Number(value.longitude)} />
      )}

      <textarea
        value={value.address}
        onChange={(e) => onChange({ address: e.target.value })}
        placeholder="Street address"
        rows={2}
        className={inputClasses}
      />
      <div className="grid grid-cols-2 gap-3">
        <input type="text" value={value.city} onChange={(e) => onChange({ city: e.target.value })} placeholder="City / Town" className={inputClasses} />
        <input type="text" value={value.state_province} onChange={(e) => onChange({ state_province: e.target.value })} placeholder="State/Province (optional)" className={inputClasses} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input type="text" value={value.country} onChange={(e) => onChange({ country: e.target.value })} placeholder="Country" className={inputClasses} />
        <input type="text" value={value.postal_code} onChange={(e) => onChange({ postal_code: e.target.value })} placeholder="Postal / Zip code (optional)" className={inputClasses} />
      </div>
    </div>
  );
};

const GoogleLocationPicker = ({ value, onChange, apiKey }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
  });
  const autocompleteRef = useRef(null);

  if (loadError) {
    return (
      <div>
        <p className="text-xs text-amber-600 mb-3">The map couldn't load — enter your address manually.</p>
        <ManualLocationFields value={value} onChange={onChange} />
      </div>
    );
  }
  if (!isLoaded) {
    return <div className="h-52 bg-gray-100 animate-pulse" />;
  }

  const pinned = hasCoords(value);
  const center = pinned ? { lat: Number(value.latitude), lng: Number(value.longitude) } : DEFAULT_CENTER;

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry) return;
    onChange({
      address: place.formatted_address || value.address,
      ...parseAddressComponents(place.address_components),
      latitude: roundCoord(place.geometry.location.lat()),
      longitude: roundCoord(place.geometry.location.lng()),
    });
  };

  const handleMarkerDragEnd = (e) => {
    onChange({ latitude: roundCoord(e.latLng.lat()), longitude: roundCoord(e.latLng.lng()) });
  };

  const handleMapClick = (e) => {
    if (!e.latLng) return;
    onChange({ latitude: roundCoord(e.latLng.lat()), longitude: roundCoord(e.latLng.lng()) });
  };

  return (
    <div className="space-y-3">
      <Autocomplete onLoad={(ac) => { autocompleteRef.current = ac; }} onPlaceChanged={handlePlaceChanged}>
        <input
          type="text"
          defaultValue={value.address}
          placeholder="Start typing your property's address..."
          className={inputClasses}
        />
      </Autocomplete>
      <div className="h-52 border border-gray-300 overflow-hidden">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={center}
          zoom={pinned ? 15 : 6}
          onClick={handleMapClick}
        >
          {pinned && (
            <Marker
              position={{ lat: Number(value.latitude), lng: Number(value.longitude) }}
              draggable
              onDragEnd={handleMarkerDragEnd}
            />
          )}
        </GoogleMap>
      </div>
      <p className="text-xs text-gray-500">
        {pinned
          ? `${value.city || 'Location'}${value.country ? `, ${value.country}` : ''} — drag the pin or click the map to fine-tune.`
          : 'Search an address or click the map to drop a pin.'}
      </p>
    </div>
  );
};

const LocationPicker = ({ value, onChange }) => {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return <ManualLocationFields value={value} onChange={onChange} />;
  }
  return <GoogleLocationPicker value={value} onChange={onChange} apiKey={apiKey} />;
};

export default LocationPicker;
