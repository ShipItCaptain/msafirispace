import React, { useRef } from 'react';
import { GoogleMap, Marker, Autocomplete, useJsApiLoader } from '@react-google-maps/api';

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

// Plain text/number inputs -- used whenever no Google Maps API key is
// configured (REACT_APP_GOOGLE_MAPS_API_KEY unset) or the script fails to
// load, so the wizard keeps working without ever hard-depending on the key.
const ManualLocationFields = ({ value, onChange }) => (
  <div className="space-y-3">
    <textarea
      value={value.address}
      onChange={(e) => onChange({ address: e.target.value })}
      placeholder="Street address"
      rows={2}
      className={inputClasses}
    />
    <div className="grid grid-cols-2 gap-3">
      <input type="text" value={value.city} onChange={(e) => onChange({ city: e.target.value })} placeholder="City" className={inputClasses} />
      <input type="text" value={value.state_province} onChange={(e) => onChange({ state_province: e.target.value })} placeholder="State/Province (optional)" className={inputClasses} />
    </div>
    <div className="grid grid-cols-2 gap-3">
      <input type="text" value={value.country} onChange={(e) => onChange({ country: e.target.value })} placeholder="Country" className={inputClasses} />
      <input type="text" value={value.postal_code} onChange={(e) => onChange({ postal_code: e.target.value })} placeholder="Postal code (optional)" className={inputClasses} />
    </div>
    <div className="grid grid-cols-2 gap-3">
      <input type="number" step="any" value={value.latitude} onChange={(e) => onChange({ latitude: e.target.value })} placeholder="Latitude (optional)" className={inputClasses} />
      <input type="number" step="any" value={value.longitude} onChange={(e) => onChange({ longitude: e.target.value })} placeholder="Longitude (optional)" className={inputClasses} />
    </div>
  </div>
);

// Google Places autocomplete + a draggable marker. Selecting an address
// fills address/city/state/country/postal/lat/lng in one go; dragging the
// pin afterward fine-tunes the exact coordinates.
const LocationPicker = ({ value, onChange }) => {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || '',
    libraries: LIBRARIES,
  });
  const autocompleteRef = useRef(null);

  if (!apiKey) {
    return <ManualLocationFields value={value} onChange={onChange} />;
  }
  if (loadError) {
    return (
      <div>
        <p className="text-xs text-amber-600 mb-3">The map couldn't load -- enter your address manually.</p>
        <ManualLocationFields value={value} onChange={onChange} />
      </div>
    );
  }
  if (!isLoaded) {
    return <div className="h-48 bg-gray-100 animate-pulse" />;
  }

  const hasPin = value.latitude !== '' && value.longitude !== '' && value.latitude != null && value.longitude != null;
  const center = hasPin ? { lat: Number(value.latitude), lng: Number(value.longitude) } : DEFAULT_CENTER;

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry) return;
    onChange({
      address: place.formatted_address || value.address,
      ...parseAddressComponents(place.address_components),
      latitude: place.geometry.location.lat(),
      longitude: place.geometry.location.lng(),
    });
  };

  const handleMarkerDragEnd = (e) => {
    onChange({ latitude: e.latLng.lat(), longitude: e.latLng.lng() });
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
      <div className="h-48 border border-gray-300 overflow-hidden">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={center}
          zoom={hasPin ? 15 : 6}
        >
          {hasPin && (
            <Marker
              position={{ lat: Number(value.latitude), lng: Number(value.longitude) }}
              draggable
              onDragEnd={handleMarkerDragEnd}
            />
          )}
        </GoogleMap>
      </div>
      {value.city && (
        <p className="text-xs text-gray-500">
          {value.city}{value.state_province ? `, ${value.state_province}` : ''}{value.country ? `, ${value.country}` : ''}
          {' -- drag the pin to fine-tune the exact location.'}
        </p>
      )}
    </div>
  );
};

export default LocationPicker;
