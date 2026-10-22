import React, { useState, useRef } from 'react';
import {
  BuildingOfficeIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

// A room image can be a locally-picked file awaiting upload ({ file, preview, isNew }),
// a saved image straight from the API ({ image, ... }), or a plain URL string.
const resolveRoomImageUrl = (image) => {
  if (!image) return '';
  if (typeof image === 'string') {
    if (!image.startsWith('http') && !image.startsWith('//')) {
      const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const baseUrl = backendUrl.replace(/\/api\/v1\/?$/, '');
      return image.startsWith('/') ? `${baseUrl}${image}` : `${baseUrl}/${image}`;
    }
    return image;
  }
  if (image.preview) return image.preview;
  const raw = image.image || image.url || '';
  if (raw && !raw.startsWith('http') && !raw.startsWith('//')) {
    const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const baseUrl = backendUrl.replace(/\/api\/v1\/?$/, '');
    return raw.startsWith('/') ? `${baseUrl}${raw}` : `${baseUrl}/${raw}`;
  }
  return raw;
};

const HostDashboardManageRoomsTab = ({
  hotels,
  allRoomTypes,
  selectedHotelForRooms,
  roomSearchQuery,
  roomFilterCategory,
  setHotels,
  setSelectedHotel,
  selectedRoomType,
  setSelectedRoomType,
  initializeRoomConfigurationState,
  loadRoomTypes,
  expandedRoomConfig,
  setExpandedRoomConfig,
  expandedRoomMode,
  setExpandedRoomMode,
  navigate,
  formatCurrency,
  roomAmenities,
  setRoomAmenities,
  roomFeatures,
  setRoomFeatures,
  roomAvailability,
  setRoomAvailability,
  handleSaveRoomConfiguration,
  lastSavedRoomId,
  setAllRoomTypes,
  setError,
  setSuccess,
  setActiveTab,
  setSelectedHotelForRooms,
}) => {
    const [basicInfoError, setBasicInfoError] = useState('');
    // Guards handleAddRoomType against firing twice for what the user
    // experiences as one click. React state (the existing-blank-draft
    // check inside handleAddRoomType) isn't enough on its own: two calls
    // that both start before either state update has committed both read
    // the same stale room_types array and both conclude no draft exists
    // yet. A ref is synchronous and shared across both calls immediately,
    // independent of when React gets around to re-rendering.
    const addRoomTypeLockRef = useRef(false);
    const isRoomConfigured = (room) => {
      if (!room?.id) return false;
      if (room.configuration_completed) return true;

      const hasImages = Array.isArray(room.images) && room.images.length > 0;
      const hasAmenities =
        (Array.isArray(room.amenity_mappings) && room.amenity_mappings.length > 0) ||
        (Array.isArray(room.amenities) && room.amenities.length > 0);
      const hasAvailability = Array.isArray(room.availability) && room.availability.length > 0;

      const createdAt = room.created_at ? new Date(room.created_at) : null;
      const updatedAt = room.updated_at ? new Date(room.updated_at) : null;
      const wasUpdatedAfterCreate = Boolean(
        createdAt &&
        updatedAt &&
        !Number.isNaN(createdAt.getTime()) &&
        !Number.isNaN(updatedAt.getTime()) &&
        updatedAt.getTime() > createdAt.getTime()
      );

      return hasImages || hasAmenities || hasAvailability || wasUpdatedAfterCreate;
    };

    // Get all hotels to group room types by hotel
    const hotelsMap = new Map();
    hotels.forEach(hotel => {
      hotelsMap.set(hotel.id, hotel);
    });

    // Group room types by hotel and include unsaved room types from hotel creation
    const roomsByHotel = new Map();
    allRoomTypes.forEach(room => {
      const hotelId = room.hotel_id;
      if (!roomsByHotel.has(hotelId)) {
        roomsByHotel.set(hotelId, []);
      }
      roomsByHotel.get(hotelId).push(room);
    });

    // Also include ALL room types from hotels in local state (both saved and unsaved)
    // This ensures we show all room types created for each hotel
    hotels.forEach(hotel => {
      if (hotel.room_types && hotel.room_types.length > 0) {
        const hotelId = hotel.id;
        if (!roomsByHotel.has(hotelId)) {
          roomsByHotel.set(hotelId, []);
        }
        
        // Add all room types from hotel state, but avoid duplicates
        hotel.room_types.forEach(room => {
          const existingRoom = roomsByHotel.get(hotelId).find(r => {
            // Match by ID if both have IDs (most reliable)
            if (r.id && room.id) return r.id === room.id;
            // Match by the client-side draft id assigned when an unsaved
            // room type is created. Required for blank/not-yet-named
            // drafts, where the name check below can never match (an
            // empty name is falsy on both sides) -- without this, a draft
            // that this same forEach already added on an earlier pass (or
            // that the render below merges in a second time) looks "new"
            // again and gets pushed as a duplicate.
            if (r._localId && room._localId) return r._localId === room._localId;
            // Match by name if both have the same name (case-insensitive)
            // This handles the case where a saved room (from API) matches an unsaved room (from local state)
            if (r.name && room.name) {
              return r.name.trim().toLowerCase() === room.name.trim().toLowerCase();
            }
            return false;
          });
          
          if (!existingRoom) {
            // Only add if it doesn't exist - this is a new room type
            roomsByHotel.get(hotelId).push({
              ...room,
              hotel_id: hotelId,
              hotel_name: hotel.name,
              hotel_location: `${hotel.city}, ${hotel.country}`
            });
          } else {
            // Room already exists - prefer the saved version (with ID) over unsaved version
            const existingIndex = roomsByHotel.get(hotelId).indexOf(existingRoom);
            if (room.id && !existingRoom.id) {
              // Replace unsaved with saved version
              roomsByHotel.get(hotelId)[existingIndex] = {
                ...room,
                hotel_id: hotelId,
                hotel_name: hotel.name,
                hotel_location: `${hotel.city}, ${hotel.country}`
              };
            } else if (room.id && existingRoom.id && room.id === existingRoom.id) {
              // Both have IDs and they match - update with latest data
              roomsByHotel.get(hotelId)[existingIndex] = {
                ...room,
                hotel_id: hotelId,
                hotel_name: hotel.name,
                hotel_location: `${hotel.city}, ${hotel.country}`
              };
            }
            // If existing room has ID and new one doesn't, keep the existing (saved) one
            // If both are unsaved, keep the existing one to avoid duplicates
          }
        });
      }
    });
    
    // Sort room types: configured first, then by name
    roomsByHotel.forEach((rooms, hotelId) => {
      rooms.sort((a, b) => {
        const aConfigured = isRoomConfigured(a);
        const bConfigured = isRoomConfigured(b);

        if (aConfigured && !bConfigured) return -1;
        if (!aConfigured && bConfigured) return 1;
        // Then sort by name
        return (a.name || '').localeCompare(b.name || '');
      });
    });

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Manage Rooms</h2>
            <p className="text-gray-600 mt-1">Configure room types for your hotels</p>
          </div>
        </div>

        {/* Filter indicator - Show when filtering by hotel */}
        {selectedHotelForRooms && (() => {
          const selectedHotel = hotels.find(h => h.id === selectedHotelForRooms);
          const savedRoomsCount = roomsByHotel.get(selectedHotelForRooms)?.length || 0;
          const pendingRoomsCount = selectedHotel?.room_types?.length || 0;
          const hasNoRoomTypes = (savedRoomsCount + pendingRoomsCount) === 0;

          // Debug logging
          console.log('🔍 Selected Hotel Debug:', {
            selectedHotelForRooms,
            selectedHotel: selectedHotel ? {
              id: selectedHotel.id,
              name: selectedHotel.name,
              city: selectedHotel.city,
              country: selectedHotel.country
            } : null,
            savedRoomsCount,
            pendingRoomsCount,
            hasNoRoomTypes
          });

          return (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center">
              <BuildingOfficeIcon className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm text-blue-900">
                  Showing room types for: <strong>{selectedHotel?.name}</strong> (ID: {selectedHotelForRooms}, {selectedHotel?.city})
              </span>
            </div>
              {hasNoRoomTypes && (
                <div className="flex items-center text-sm text-amber-700 bg-amber-50 rounded-md px-3 py-2">
                  <span className="text-lg mr-2" aria-hidden>😴</span>
                  <span>No room types yet for this hotel.</span>
          </div>
        )}
            </div>
          );
        })()}

        {/* Hotels with Room Types */}
        {(() => {
          // If filtering by a specific hotel, ensure we show it even if it has no room types in allRoomTypes
          // Without a specific hotel picked, don't silently show only whichever
          // hotels happen to already have a room type — that hides room-less
          // hotels entirely with no indication they exist. The picker below
          // handles hotel selection uniformly instead.
          const hotelsToShow = selectedHotelForRooms
            ? [{ id: selectedHotelForRooms, ...hotels.find(h => h.id === selectedHotelForRooms) }]
            : [];
          
          return hotelsToShow.map((hotel) => {
            if (!hotel) return null;
            
            const hotelId = hotel.id;

            // Shared by both "Add Room Type" entry points below (the
            // no-rooms-yet empty state and the button at the end of the
            // list). Reuses an already-pending blank draft instead of
            // stacking a second one on top of it, and the ref below guards
            // against a literal double-click adding two in the same tick.
            const handleAddRoomType = () => {
              if (addRoomTypeLockRef.current) return;
              addRoomTypeLockRef.current = true;
              setTimeout(() => { addRoomTypeLockRef.current = false; }, 500);

              const currentRoomTypes = hotel.room_types || [];
              const draftIndex = currentRoomTypes.findIndex((room) => !room.id && !room.name?.trim());

              if (draftIndex !== -1) {
                const draft = currentRoomTypes[draftIndex]._localId
                  ? currentRoomTypes[draftIndex]
                  : { ...currentRoomTypes[draftIndex], _localId: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
                const updatedRoomTypes = [...currentRoomTypes];
                updatedRoomTypes[draftIndex] = draft;
                const updatedHotel = { ...hotel, room_types: updatedRoomTypes };

                setHotels((prevHotels) => prevHotels.map((h) => (h.id === hotelId ? updatedHotel : h)));
                setSelectedHotel(updatedHotel);
                setSelectedRoomType(draft);
                initializeRoomConfigurationState(draft);
                setExpandedRoomMode('edit');
                setExpandedRoomConfig({ hotelId, roomKey: `${hotelId}-${draft._localId}` });
                return;
              }

              const newRoomType = {
                _localId: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                name: '',
                description: '',
                category: '',
                bed_type: '',
                max_adults: 2,
                max_children: 1,
                base_price: '',
                currency: 'USD',
                images: [],
                basic_info_completed: false,
              };

              const updatedHotel = {
                ...hotel,
                room_types: [...currentRoomTypes, newRoomType],
              };

              setHotels((prevHotels) => prevHotels.map((h) => (h.id === hotelId ? updatedHotel : h)));
              setSelectedHotel(updatedHotel);
              setSelectedRoomType(newRoomType);
              initializeRoomConfigurationState(newRoomType);
              setExpandedRoomMode('edit');
              setExpandedRoomConfig({ hotelId, roomKey: `${hotelId}-${newRoomType._localId}` });

              loadRoomTypes();
            };

            // Start with room types from API
            let rooms = roomsByHotel.get(hotelId) || [];
            
            // ALWAYS include ALL room types from hotel.room_types (local state)
            // This is critical for showing room types that were just created but not yet saved
            if (hotel.room_types && hotel.room_types.length > 0) {
              hotel.room_types.forEach(room => {
                // Check if this room type is already in the list
                const existsInList = rooms.some(r => {
                  // Match by ID if both have IDs (most reliable)
                  if (r.id && room.id) return r.id === room.id;
                  // Match by the client-side draft id. Covers blank/not-yet-named
                  // drafts, which the name check below can never match -- this
                  // list already includes anything the pass above (roomsByHotel)
                  // merged in from the same hotel.room_types array, so without
                  // this check a blank draft looks "new" again here and is
                  // pushed a second time.
                  if (r._localId && room._localId) return r._localId === room._localId;
                  // Match by name if both have names (case-insensitive)
                  // This handles duplicates where one is saved (from API) and one is unsaved (from local state)
                  if (r.name && room.name) {
                    return r.name.trim().toLowerCase() === room.name.trim().toLowerCase();
                  }
                  return false;
                });
                
                if (!existsInList) {
                  // Add new room type with hotel metadata
                  rooms.push({
                    ...room,
                    hotel_id: hotelId,
                    hotel_name: hotel.name,
                    hotel_location: `${hotel.city}, ${hotel.country}`
                  });
                } else {
                  // Room already exists - prefer saved version (with ID) over unsaved
                  const existingIndex = rooms.findIndex(r => {
                    if (r.id && room.id) return r.id === room.id;
                    if (r._localId && room._localId) return r._localId === room._localId;
                    if (r.name && room.name) {
                      return r.name.trim().toLowerCase() === room.name.trim().toLowerCase();
                    }
                    return false;
                  });
                  
                  if (existingIndex !== -1) {
                    // If we have a saved version (with ID) and existing is unsaved, replace it
                    if (room.id && !rooms[existingIndex].id) {
                      rooms[existingIndex] = {
                        ...room,
                        hotel_id: hotelId,
                        hotel_name: hotel.name,
                        hotel_location: `${hotel.city}, ${hotel.country}`
                      };
                    } else if (room.id && rooms[existingIndex].id && room.id === rooms[existingIndex].id) {
                      // Both have same ID - update with latest data
                      rooms[existingIndex] = {
                        ...room,
                        hotel_id: hotelId,
                        hotel_name: hotel.name,
                        hotel_location: `${hotel.city}, ${hotel.country}`
                      };
                    }
                    // If existing has ID and new one doesn't, keep existing (saved) version
                    // If both are unsaved, keep existing to avoid duplicates
                  }
                }
              });
            }
            
            // Sort room types: configured first, then by name
            rooms.sort((a, b) => {
              const aConfigured = isRoomConfigured(a);
              const bConfigured = isRoomConfigured(b);

              if (aConfigured && !bConfigured) return -1;
              if (!aConfigured && bConfigured) return 1;
              return (a.name || '').localeCompare(b.name || '');
            });

            const filteredRoomsForHotel = rooms.filter(room => {
              const matchesSearch = room.name?.toLowerCase().includes(roomSearchQuery.toLowerCase()) ||
                                   hotel.name?.toLowerCase().includes(roomSearchQuery.toLowerCase());
              const matchesCategory = roomFilterCategory === 'all' || room.category === roomFilterCategory;
              return matchesSearch && matchesCategory;
            });

            // If filtering by hotel but no rooms found, show message
            if (filteredRoomsForHotel.length === 0 && selectedHotelForRooms) {
              return (
                <div key={hotelId} className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                  <div className="text-6xl mb-4" aria-hidden>🛏️🚫</div>
                  <p className="text-gray-700 mb-4">
                    Empty for now — add a room type when you create the hotel.
                  </p>
          <button
            onClick={handleAddRoomType}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Room Type
          </button>
                </div>
              );
            }

            // Skip if no rooms and not filtering by hotel
            if (filteredRoomsForHotel.length === 0 && !selectedHotelForRooms) return null;

            return (
              <div key={hotelId} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Hotel Header */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{hotel.name}</h3>
                    <p className="text-sm text-gray-600">{hotel.city}, {hotel.country}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 text-sm font-medium text-gray-700 bg-white rounded-full border border-gray-300">
                      {filteredRoomsForHotel.length} {filteredRoomsForHotel.length === 1 ? 'Room Type' : 'Room Types'}
                    </span>
                    {/* Configuration Status Summary */}
                    {filteredRoomsForHotel.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          {filteredRoomsForHotel.filter((room) => isRoomConfigured(room)).length} Configured
                        </span>
                        {filteredRoomsForHotel.filter((room) => !isRoomConfigured(room)).length > 0 && (
                          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                            {filteredRoomsForHotel.filter((room) => !isRoomConfigured(room)).length} Pending
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Room Types List */}
              <div className="divide-y divide-gray-200">
                {filteredRoomsForHotel.map((room, index) => {
                  // A stable identity for this row: the saved DB id once one
                  // exists, otherwise the _localId assigned when the draft
                  // was created. Never derived from room.name or the array
                  // index -- both change as the user types (the list
                  // re-sorts by name) or as rows are added/removed, which
                  // previously caused this row's DOM node (and the input
                  // inside it) to remount and drop focus after almost every
                  // keystroke.
                  const roomKey = `${hotelId}-${room.id || room._localId || index}`;
                  const isExpanded = expandedRoomConfig?.hotelId === hotelId && expandedRoomConfig?.roomKey === roomKey;
                  const roomData = (isExpanded ? selectedRoomType : null) || room;
                  const amenityNames = roomData.amenity_mappings
                    ? roomData.amenity_mappings
                        .map(m => m.amenity?.name || m.amenity_name || m.name)
                        .filter(Boolean)
                    : (roomData.amenities || []);
                  const featureNames = [
                    roomData.has_balcony ? 'Balcony' : null,
                    roomData.has_kitchen ? 'Kitchen' : null,
                    roomData.has_workspace ? 'Workspace' : null,
                    roomData.has_bathtub ? 'Bathtub' : null,
                    roomData.has_shower ? 'Shower' : null,
                    roomData.has_sea_view ? 'Sea View' : null,
                    roomData.has_city_view ? 'City View' : null,
                    roomData.has_garden_view ? 'Garden View' : null,
                  ].filter(Boolean);
                  const roomConfigured = isRoomConfigured(room);
                  const roomWasJustSaved = room.id && room.id === lastSavedRoomId;

                  return (
                    <div key={roomKey}>
                      {/* Room Type Header - Clickable to expand/collapse */}
                      <div
                        className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => {
                          if (isExpanded) {
                            setExpandedRoomConfig(null);
                            setSelectedRoomType(null);
                            setExpandedRoomMode('view');
                          } else {
                            setExpandedRoomMode('view');
                            setExpandedRoomConfig({ hotelId, roomKey });
                            setSelectedHotel(hotel);
                            setSelectedRoomType(room);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h4 className="text-base font-semibold text-gray-900">{room.name?.trim() || 'New Room Type'}</h4>
                              {room.room_save_error && (
                                <span className="px-2.5 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full flex items-center gap-1">
                                  <ExclamationTriangleIcon className="h-3 w-3" />
                                  Needs Fix
                                </span>
                              )}
                              {roomConfigured ? (
                                <span className="px-2.5 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full flex items-center gap-1">
                                  <CheckCircleIcon className="h-3 w-3" />
                                  Configured
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full flex items-center gap-1">
                                  <ExclamationTriangleIcon className="h-3 w-3" />
                                  Needs Configuration
                                </span>
                              )}
                            </div>
                            <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                              <span className="capitalize font-medium">
                                {room.id ? (room.category || 'Standard') : 'Category not set'}
                              </span>
                              <span>•</span>
                              <span className="capitalize">
                                {room.id ? (room.bed_type || 'Bed not set') : 'Bed type not set'}
                              </span>
                              {room.base_price > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="font-semibold text-gray-900">
                                    {room.currency || 'USD'} {formatCurrency(room.base_price)}/night
                                  </span>
                                </>
                              )}
                            </div>
                            {/* Show configuration summary if configured */}
                            {roomConfigured ? (
                              <div className="mt-2 text-xs text-gray-500">
                                Configuration saved • Ready for bookings
                              </div>
                            ) : (
                              <div className="mt-2 text-xs text-amber-600">
                                Room created, but setup is not finished yet
                              </div>
                            )}
                            {room.room_save_error && (
                              <div className="mt-2 text-xs text-red-600">
                                {room.room_save_error}
                              </div>
                            )}
                            {roomWasJustSaved && (
                              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                                <CheckCircleIcon className="h-4 w-4" />
                                Room configuration saved successfully
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {room.id ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Navigate to edit page with room ID and hotel ID
                                  navigate(`/host/rooms/${room.id}/edit?hotelId=${hotelId}`);
                                }}
                                className="text-sm text-blue-600 font-medium hover:text-blue-800"
                              >
                                {roomConfigured ? 'Edit Configuration' : 'Continue Configuration'}
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedRoomMode('edit');
                                  setExpandedRoomConfig({ hotelId, roomKey });
                                  setSelectedHotel(hotel);
                                  setSelectedRoomType(room);
                                  initializeRoomConfigurationState(room);
                                }}
                                className="text-sm text-blue-600 font-medium hover:text-blue-800"
                              >
                                Configure Now
                              </button>
                            )}
                            <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`} />
                          </div>
                        </div>
                      </div>

                      {/* Expanded Detail View */}
                      {isExpanded && expandedRoomMode === 'view' && roomData && (
                        <div className="px-6 py-6 bg-gray-50 border-t border-gray-200">
                          <div className="max-w-4xl space-y-6">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="text-lg font-semibold text-gray-900 mb-1">{roomData.name || 'Room Type'}</h4>
                                <p className="text-sm text-gray-600">{roomData.description || 'No description provided.'}</p>
                              </div>
                              {roomData.id && (
                                <button
                                  onClick={() => {
                                    // Navigate to edit page with room ID and hotel ID
                                    navigate(`/host/rooms/${roomData.id}/edit?hotelId=${hotelId}`);
                                  }}
                                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  Edit Configuration
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                              <div>
                                <p className="font-medium text-gray-900">Category</p>
                                <p>{roomData.category || 'Not set'}</p>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">Bed Type</p>
                                <p>{roomData.bed_type || 'Not set'}</p>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">Max Adults</p>
                                <p>{roomData.max_adults ?? 'Not set'}</p>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">Max Children</p>
                                <p>{roomData.max_children ?? 'Not set'}</p>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">Base Price</p>
                                <p>{roomData.base_price ? `${roomData.currency || 'USD'} ${roomData.base_price}` : 'Not set'}</p>
                              </div>
                            </div>

                            <div className="text-sm text-gray-700 space-y-2">
                              <p className="font-medium text-gray-900">Images</p>
                              {roomData.images && roomData.images.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  {roomData.images.map((img, idx) => (
                                    <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                                      <img
                                        src={resolveRoomImageUrl(img)}
                                        alt={`${roomData.name || 'Room'} - ${idx + 1}`}
                                        className="w-full h-24 object-cover"
                                      />
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-gray-500">No images added.</p>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                              <div>
                                <p className="font-medium text-gray-900">Amenities</p>
                                <p>{amenityNames.length > 0 ? amenityNames.join(', ') : 'Not set'}</p>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">Features</p>
                                <p>
                                  {featureNames.length > 0 ? featureNames.join(', ') : 'Not set'}
                                </p>
                              </div>
                            </div>

                            <div className="text-sm text-gray-500">
                              <p>{roomConfigured ? 'Click "Edit Configuration" to update this room type.' : 'This room still needs full setup before it should appear as configured.'}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Expanded Configuration Panel */}
                      {isExpanded && expandedRoomMode === 'edit' && (
                        <div className="px-6 py-6 bg-gray-50 border-t border-gray-200">
                          {/* Render the room configuration form here */}
                          {selectedRoomType && (
                            <div className="max-w-4xl">
                              {/* Basic Room Type Form - Show first if room type doesn't have basic info */}
                              {(!selectedRoomType.basic_info_completed) ? (
                                <div className="space-y-6">
                                  <div>
                                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Room Type Information</h4>
                                    <p className="text-sm text-gray-600 mb-6">Fill in the basic room type details before configuring amenities and images.</p>
                                    {selectedRoomType.room_save_error && (
                                      <p className="text-sm text-red-600 mb-4">
                                        {selectedRoomType.room_save_error}
                                      </p>
                                    )}
                                  </div>

                                  {/* Room Name */}
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Room Name *</label>
                                    <input
                                      type="text"
                                      value={selectedRoomType.name || ''}
                                      onChange={(e) => {
                                        const updated = { ...selectedRoomType, name: e.target.value };
                                        setSelectedRoomType(updated);
                                        // Update in hotel's room_types array
                                        const updatedHotels = hotels.map(h => 
                                          h.id === hotelId ? {
                                            ...h,
                                            room_types: (h.room_types || []).map(rt => 
                                              rt === selectedRoomType ? updated : rt
                                            )
                                          } : h
                                        );
                                        setHotels(updatedHotels);
                                      }}
                                      placeholder="e.g., Deluxe King Room, Standard Double Room"
                                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>

                                  {/* Category and Bed Type */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                                      <select
                                        value={selectedRoomType.category || ''}
                                        onChange={(e) => {
                                          const updated = { ...selectedRoomType, category: e.target.value };
                                          setSelectedRoomType(updated);
                                          const updatedHotels = hotels.map(h => 
                                            h.id === hotelId ? {
                                              ...h,
                                              room_types: (h.room_types || []).map(rt => 
                                                rt === selectedRoomType ? updated : rt
                                              )
                                            } : h
                                          );
                                          setHotels(updatedHotels);
                                        }}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      >
                                        <option value="">Select category</option>
                                        <option value="standard">Standard</option>
                                        <option value="deluxe">Deluxe</option>
                                        <option value="suite">Suite</option>
                                        <option value="presidential">Presidential</option>
                                        <option value="family">Family</option>
                                        <option value="executive">Executive</option>
                                        <option value="studio">Studio</option>
                                        <option value="penthouse">Penthouse</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">Bed Type *</label>
                                      <select
                                        value={selectedRoomType.bed_type || ''}
                                        onChange={(e) => {
                                          const updated = { ...selectedRoomType, bed_type: e.target.value };
                                          setSelectedRoomType(updated);
                                          const updatedHotels = hotels.map(h => 
                                            h.id === hotelId ? {
                                              ...h,
                                              room_types: (h.room_types || []).map(rt => 
                                                rt === selectedRoomType ? updated : rt
                                              )
                                            } : h
                                          );
                                          setHotels(updatedHotels);
                                        }}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      >
                                        <option value="">Select bed type</option>
                                        <option value="single">Single Bed</option>
                                        <option value="double">Double Bed</option>
                                        <option value="queen">Queen Bed</option>
                                        <option value="king">King Bed</option>
                                        <option value="twin">Twin Beds</option>
                                        <option value="sofa_bed">Sofa Bed</option>
                                        <option value="bunk_bed">Bunk Beds</option>
                                      </select>
                                    </div>
                                  </div>

                                  {/* Description */}
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                    <textarea
                                      value={selectedRoomType.description || ''}
                                      onChange={(e) => {
                                        const updated = { ...selectedRoomType, description: e.target.value };
                                        setSelectedRoomType(updated);
                                        const updatedHotels = hotels.map(h => 
                                          h.id === hotelId ? {
                                            ...h,
                                            room_types: (h.room_types || []).map(rt => 
                                              rt === selectedRoomType ? updated : rt
                                            )
                                          } : h
                                        );
                                        setHotels(updatedHotels);
                                      }}
                                      rows={4}
                                      placeholder="Describe the room type, its features, and what makes it special..."
                                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>

                                  {/* Occupancy and Pricing */}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">Max Adults *</label>
                                      <input
                                        type="number"
                                        min="1"
                                        value={selectedRoomType.max_adults || ''}
                                        onChange={(e) => {
                                          const updated = { ...selectedRoomType, max_adults: parseInt(e.target.value) || 2 };
                                          setSelectedRoomType(updated);
                                          const updatedHotels = hotels.map(h => 
                                            h.id === hotelId ? {
                                              ...h,
                                              room_types: (h.room_types || []).map(rt => 
                                                rt === selectedRoomType ? updated : rt
                                              )
                                            } : h
                                          );
                                          setHotels(updatedHotels);
                                        }}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="2"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">Max Children</label>
                                      <input
                                        type="number"
                                        min="0"
                                        value={selectedRoomType.max_children || ''}
                                        onChange={(e) => {
                                          const updated = { ...selectedRoomType, max_children: parseInt(e.target.value) || 0 };
                                          setSelectedRoomType(updated);
                                          const updatedHotels = hotels.map(h => 
                                            h.id === hotelId ? {
                                              ...h,
                                              room_types: (h.room_types || []).map(rt => 
                                                rt === selectedRoomType ? updated : rt
                                              )
                                            } : h
                                          );
                                          setHotels(updatedHotels);
                                        }}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="1"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                                      <select
                                        value={selectedRoomType.currency || 'USD'}
                                        onChange={(e) => {
                                          const updated = { ...selectedRoomType, currency: e.target.value };
                                          setSelectedRoomType(updated);
                                          const updatedHotels = hotels.map(h => 
                                            h.id === hotelId ? {
                                              ...h,
                                              room_types: (h.room_types || []).map(rt => 
                                                rt === selectedRoomType ? updated : rt
                                              )
                                            } : h
                                          );
                                          setHotels(updatedHotels);
                                        }}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      >
                                        <option value="USD">USD</option>
                                        <option value="KES">KES</option>
                                        <option value="EUR">EUR</option>
                                        <option value="GBP">GBP</option>
                                      </select>
                                    </div>
                                  </div>

                                  {/* Base Price */}
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Base Price per Night *</label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={selectedRoomType.base_price === 0 ? '' : selectedRoomType.base_price}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        const updated = { ...selectedRoomType, base_price: value };
                                        setSelectedRoomType(updated);
                                        const updatedHotels = hotels.map(h => 
                                          h.id === hotelId ? {
                                            ...h,
                                            room_types: (h.room_types || []).map(rt => 
                                              rt === selectedRoomType ? updated : rt
                                            )
                                          } : h
                                        );
                                        setHotels(updatedHotels);
                                      }}
                                      placeholder="0.00"
                                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>

                                  {/* Save Basic Info Button */}
                                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                                    {basicInfoError && (
                                      <div className="flex-1 text-sm text-red-600 self-center">
                                        {basicInfoError}
                                      </div>
                                    )}
                                    <button
                                      onClick={() => {
                                        setExpandedRoomConfig(null);
                                        setSelectedRoomType(null);
                                        setBasicInfoError('');
                                      }}
                                      className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => {
                                        // Validate required fields
                                        if (!selectedRoomType.name || !selectedRoomType.category || !selectedRoomType.bed_type || selectedRoomType.base_price === '' || selectedRoomType.base_price === null || selectedRoomType.base_price === undefined) {
                                          setBasicInfoError('Please fill in all required fields (Room Name, Category, Bed Type, and Base Price).');
                                          return;
                                        }
                                        setBasicInfoError('');
                                        
                                        const updated = { ...selectedRoomType, basic_info_completed: true };
                                        setSelectedRoomType(updated);
                                        const updatedHotels = hotels.map(h => 
                                          h.id === hotelId ? {
                                            ...h,
                                            room_types: (h.room_types || []).map(rt => 
                                              rt === selectedRoomType ? updated : rt
                                            )
                                          } : h
                                        );
                                        setHotels(updatedHotels);

                                        setSuccess('Basic room type information saved! Now configure images, amenities, and availability.');
                                      }}
                                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                      Save Basic Info & Continue
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                              {/* Room Images */}
                              <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-3">Room Images</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  {selectedRoomType.images && selectedRoomType.images.map((image, imgIndex) => (
                                    <div key={imgIndex} className="relative">
                                      <img
                                        src={resolveRoomImageUrl(image)}
                                        alt={`${selectedRoomType.name} - ${imgIndex + 1}`}
                                        className="w-full h-24 object-cover rounded-lg border border-gray-300"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedRoomType({
                                            ...selectedRoomType,
                                            images: (selectedRoomType.images || []).filter((_, i) => i !== imgIndex)
                                          });
                                          // Update hotel in hotels array
                                          // Update allRoomTypes if this room is in there
                                          setAllRoomTypes(prev => prev.map(rt => 
                                            (rt.hotel_id === hotel.id && rt.name === selectedRoomType.name && !rt.id)
                                              ? { ...rt, images: (selectedRoomType.images || []).filter((_, i) => i !== imgIndex) }
                                              : rt
                                          ));
                                        }}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                  {(!selectedRoomType.images || selectedRoomType.images.length < 5) && (
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg h-24 flex items-center justify-center hover:border-blue-500 hover:bg-blue-50 transition-colors">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const fileInput = document.getElementById(`room-image-input-${roomKey}`);
                                          fileInput?.click();
                                        }}
                                        className="text-center w-full h-full flex flex-col items-center justify-center"
                                      >
                                        <PlusIcon className="h-6 w-6 mx-auto text-gray-400 mb-1" />
                                        <span className="text-xs text-gray-600">Add Image</span>
                                      </button>
                                      <input
                                        id={`room-image-input-${roomKey}`}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => {
                                          const files = Array.from(e.target.files);
                                          // Store both the File object and preview URL
                                          const newImages = files.map(file => ({
                                            file: file, // Keep the File object for upload
                                            preview: URL.createObjectURL(file), // Preview URL
                                            isNew: true // Flag to indicate this needs to be uploaded
                                          }));
                                          setSelectedRoomType({
                                            ...selectedRoomType,
                                            images: [...(selectedRoomType.images || []), ...newImages]
                                          });
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Upload high-quality images (max 5)</p>
                              </div>

                              {/* Room Amenities */}
                              <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-3">Room Amenities</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                  {[
                                    'Air Conditioning', 'Wi-Fi', 'TV', 'Mini Bar', 'Safe', 'Balcony',
                                    'Ocean View', 'City View', 'Kitchenette', 'Coffee Maker', 'Iron',
                                    'Hair Dryer', 'Work Desk', 'Sofa', 'Bathtub', 'Shower', 'Refrigerator',
                                    'Microwave', 'Room Service', 'Daily Housekeeping', 'Wake-up Service',
                                    'Laundry Service', '24/7 Room Service', 'Private Bathroom'
                                  ].map((amenity) => (
                                    <label key={amenity} className="flex items-center space-x-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={roomAmenities.includes(amenity)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setRoomAmenities(prev => [...prev, amenity]);
                                          } else {
                                            setRoomAmenities(prev => prev.filter(a => a !== amenity));
                                          }
                                        }}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span className="text-sm text-gray-700">{amenity}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>

                              {/* Room Features */}
                              <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-3">Room Features</label>
                                <div className="space-y-2">
                                  <label className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      checked={roomFeatures.non_smoking}
                                      onChange={(e) => setRoomFeatures(prev => ({ ...prev, non_smoking: e.target.checked }))}
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">Non-Smoking Room</span>
                                  </label>
                                  <label className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      checked={roomFeatures.pet_friendly}
                                      onChange={(e) => setRoomFeatures(prev => ({ ...prev, pet_friendly: e.target.checked }))}
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">Pet Friendly</span>
                                  </label>
                                  <label className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      checked={roomFeatures.wheelchair_accessible}
                                      onChange={(e) => setRoomFeatures(prev => ({ ...prev, wheelchair_accessible: e.target.checked }))}
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">Wheelchair Accessible</span>
                                  </label>
                                </div>
                              </div>

                              {/* Room Availability */}
                              <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-3">Room Availability</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">Total Rooms Available</label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={roomAvailability.total_rooms}
                                      onChange={(e) => setRoomAvailability(prev => ({ ...prev, total_rooms: parseInt(e.target.value) || 1 }))}
                                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      placeholder="1"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">Maximum Nights</label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={roomAvailability.maximum_stay || 30}
                                      onChange={(e) => setRoomAvailability(prev => ({ ...prev, maximum_stay: parseInt(e.target.value) || 30 }))}
                                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      placeholder="30"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Save Button */}
                              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                                <button
                                  onClick={() => {
                                    setExpandedRoomConfig(null);
                                    setSelectedRoomType(null);
                                  }}
                                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={async () => {
                                    await handleSaveRoomConfiguration();
                                    // Refresh room types
                                    await loadRoomTypes();
                                    // Keep expanded or close based on preference
                                    setExpandedRoomConfig(null);
                                    setSelectedRoomType(null);
                                  }}
                                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  Save Configuration
                                </button>
                              </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Add Room Type Button - Show when hotel has room types */}
                <div className="px-6 py-4 border-t border-gray-200">
                  <button
                    onClick={handleAddRoomType}
                    className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-gray-700 hover:text-blue-700"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    <span className="font-medium">Add Room Type</span>
                  </button>
                </div>
              </div>
            </div>
            );
          });
        })()}

        {/* Once a specific hotel is picked, the section above already renders
            it (with its own "Add Room Type" button, even if it has zero rooms
            so far). Without a pick, always resolve which hotel first — rather
            than only listing whichever hotels already happen to have a room
            type and silently hiding the rest. */}
        {!selectedHotelForRooms && (
          hotels.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="text-6xl mb-4" aria-hidden>🏨✨</div>
              <p className="text-gray-700 mb-4">Add a hotel first, then come back here to add its room types.</p>
              <button
                onClick={() => setActiveTab('hotels')}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Hotel
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4" aria-hidden>🏨✨</div>
                <p className="text-gray-700">Which hotel do you want to add room types for?</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                {hotels.map((hotel) => (
                  <button
                    key={hotel.id}
                    onClick={() => setSelectedHotelForRooms(hotel.id)}
                    className="flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                  >
                    <span>
                      <span className="block font-medium text-gray-900">{hotel.name}</span>
                      <span className="block text-xs text-gray-500">{hotel.city}, {hotel.country}</span>
                    </span>
                    <BuildingOfficeIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    );
};

export default HostDashboardManageRoomsTab;
