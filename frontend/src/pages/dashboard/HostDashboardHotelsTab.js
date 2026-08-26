import React from 'react';
import { motion } from 'framer-motion';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CogIcon,
  StarIcon,
  MapPinIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

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

const HostDashboardHotelsTab = ({
  hotels,
  onAddHotel,
  onOpenHotelRooms,
  onManageHotelRooms,
  onEditHotel,
  onDeleteHotel,
}) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-bold text-gray-900">My Hotels</h2>
      <button
        onClick={onAddHotel}
        data-testid="host-add-hotel-button"
        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <PlusIcon className="h-5 w-5 mr-2" />
        Add Hotel
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {hotels.map((hotel) => {
        const roomTypes = hotel.room_types || [];
        const configuredRooms = roomTypes.filter((room) => isRoomConfigured(room)).length;
        const roomsNeedingSetup = Math.max(roomTypes.length - configuredRooms, 0);

        return (
        <motion.div
          key={hotel.id}
          data-testid={`hotel-card-${hotel.id}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
        >
          <div className="relative h-32 bg-gradient-to-r from-blue-500 to-purple-600">
            <div className="absolute inset-0 bg-black bg-opacity-10"></div>
            <div className="absolute top-2 right-2">
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                hotel.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {hotel.is_verified ? 'Active' : 'Pending'}
              </span>
            </div>
            <div className="absolute bottom-2 left-2 text-white">
              <h3 className="text-sm font-bold truncate max-w-[180px]">{hotel.name}</h3>
              <p className="text-xs opacity-90 flex items-center">
                <MapPinIcon className="h-3 w-3 mr-1" />
                {hotel.city}, {hotel.country}
              </p>
            </div>
          </div>

          <div className="p-3">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center space-x-3">
                <div className="flex items-center">
                  <StarIcon className="h-3 w-3 text-yellow-500 mr-1" />
                  <span className="text-xs font-medium text-gray-900">{hotel.star_rating || 'N/A'}</span>
                </div>
                <div className="text-xs text-gray-500">{hotel.total_rooms || 0} rooms</div>
              </div>
              <div className="text-xs text-gray-500 capitalize">{hotel.property_type || 'Hotel'}</div>
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700">
                {roomTypes.length} room type{roomTypes.length === 1 ? '' : 's'}
              </span>
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                {configuredRooms} configured
              </span>
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                {roomsNeedingSetup} need setup
              </span>
            </div>

            {roomTypes.length > 0 && (
              <div className="mb-3">
                <div className="space-y-1">
                  {roomTypes.slice(0, 2).map((room, index) => (
                    <div key={index} className="flex justify-between items-center text-xs">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-900 truncate block">{room.name || `Room ${index + 1}`}</span>
                        <span className="text-gray-500">{room.currency} {room.base_price}/night</span>
                      </div>
                      <div className="ml-2">
                        {isRoomConfigured(room) ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">✓</span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">⏳</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {roomTypes.length > 2 && (
                    <div className="text-xs text-gray-500">+{roomTypes.length - 2} more room types</div>
                  )}
                </div>
              </div>
            )}

            <div className="flex space-x-1">
              <button
                onClick={async () => onManageHotelRooms(hotel.id)}
                className="flex-1 flex items-center justify-center px-2 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <CogIcon className="h-3 w-3 mr-1" />
                Manage Rooms
              </button>
              <button
                onClick={() => onEditHotel(hotel)}
                className="flex-1 flex items-center justify-center px-2 py-1.5 text-xs border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <PencilIcon className="h-3 w-3 mr-1" />
                Edit
              </button>
              <button
                onClick={() => onDeleteHotel(hotel.id)}
                className="flex items-center justify-center px-2 py-1.5 text-xs border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                <TrashIcon className="h-3 w-3" />
              </button>
            </div>
          </div>
        </motion.div>
      )})}
      {hotels.length === 0 && (
        <div className="col-span-2 text-center py-12">
          <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hotels yet</h3>
          <p className="text-gray-500 mb-4">Get started by adding your first hotel property.</p>
          <button
            onClick={onAddHotel}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Your First Hotel
          </button>
        </div>
      )}
    </div>
  </div>
);

export default HostDashboardHotelsTab;
