import React, { useEffect, useMemo, useState } from 'react';
import { UsersIcon, MinusIcon, PlusIcon, HomeModernIcon } from '@heroicons/react/24/outline';
import { bookingsAPI, getApiErrorDetails } from '../../services/api';
import { toast } from 'react-hot-toast';
import ImageLightbox from '../common/ImageLightbox';

const AMENITY_LABELS = [
  ['has_balcony', 'Balcony'],
  ['has_kitchen', 'Kitchen'],
  ['has_living_room', 'Living room'],
  ['has_dining_area', 'Dining area'],
  ['has_workspace', 'Workspace'],
  ['has_bathtub', 'Bathtub'],
  ['has_shower', 'Shower'],
  ['has_sea_view', 'Sea view'],
  ['has_city_view', 'City view'],
  ['has_garden_view', 'Garden view'],
];

const MAX_QUANTITY = 5;
const todayIso = () => new Date().toISOString().split('T')[0];

const RoomTypesBookingTable = ({ hotelId, roomTypes, isAuthenticated, user, navigate }) => {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [numAdults, setNumAdults] = useState(1);
  const [numChildren, setNumChildren] = useState(0);
  const [quantities, setQuantities] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lightboxRoom, setLightboxRoom] = useState(null);
  const [datesTouched, setDatesTouched] = useState(false);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const diff = (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24);
    return diff > 0 ? diff : 0;
  }, [checkIn, checkOut]);

  const hasDates = nights > 0;

  const selectedRows = useMemo(
    () =>
      roomTypes
        .map((room) => ({ room, quantity: quantities[room.id] || 0 }))
        .filter((row) => row.quantity > 0),
    [roomTypes, quantities]
  );

  const capacity = useMemo(() => {
    if (selectedRows.length === 0) return null;
    return selectedRows.reduce(
      (acc, row) => ({
        maxAdults: acc.maxAdults + (row.room.max_adults || 0) * row.quantity,
        maxChildren: acc.maxChildren + (row.room.max_children || 0) * row.quantity,
      }),
      { maxAdults: 0, maxChildren: 0 }
    );
  }, [selectedRows]);

  useEffect(() => {
    if (!capacity) return;
    if (numAdults > capacity.maxAdults) setNumAdults(Math.max(capacity.maxAdults, 1));
    if (numChildren > capacity.maxChildren) setNumChildren(capacity.maxChildren);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capacity]);

  const totalPrice = useMemo(() => {
    if (!nights) return 0;
    return selectedRows.reduce(
      (sum, row) => sum + (row.room.base_price || 0) * row.quantity * nights,
      0
    );
  }, [selectedRows, nights]);

  if (!roomTypes || roomTypes.length === 0) {
    return (
      <div className="border border-dashed border-gray-200 px-5 py-10 text-center">
        <p className="text-sm font-medium text-gray-900">No rooms listed yet</p>
        <p className="mt-1 text-sm text-gray-500">Check back soon for availability.</p>
      </div>
    );
  }

  const adjustQuantity = (roomId, delta) => {
    setQuantities((prev) => {
      const next = Math.min(Math.max((prev[roomId] || 0) + delta, 0), MAX_QUANTITY);
      return { ...prev, [roomId]: next };
    });
  };

  const handleReserve = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/hotel/${hotelId}` } } });
      return;
    }
    if (!checkIn || !checkOut) {
      setDatesTouched(true);
      toast.error('Add check-in and check-out dates first');
      return;
    }
    if (new Date(checkIn) >= new Date(checkOut)) {
      toast.error('Check-out must be after check-in');
      return;
    }
    if (selectedRows.length === 0) {
      toast.error('Select at least one room');
      return;
    }

    setIsSubmitting(true);
    try {
      const guestFullName =
        user?.first_name && user?.last_name
          ? `${user.first_name} ${user.last_name}`.trim()
          : user?.email || 'Guest';

      const booking = await bookingsAPI.createMultiRoomBooking({
        hotel_id: hotelId,
        check_in: checkIn,
        check_out: checkOut,
        num_adults: numAdults,
        num_children: numChildren,
        guest_full_name: guestFullName,
        guest_email: user?.email || '',
        guest_phone: user?.phone_number || '',
        special_requests: '',
        items: selectedRows.map((row) => ({ room_type_id: row.room.id, quantity: row.quantity })),
      });
      toast.success('Reservation requested!');
      navigate(`/booking/${booking.id}`);
    } catch (error) {
      const { fullMessage } = getApiErrorDetails(error, 'Failed to create booking. Please try again.');
      toast.error(fullMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tripSummary = hasDates
    ? `${nights} night${nights === 1 ? '' : 's'} · ${numAdults} adult${numAdults === 1 ? '' : 's'}${
        numChildren ? ` · ${numChildren} child${numChildren === 1 ? '' : 'ren'}` : ''
      }`
    : null;

  return (
    <div id="rooms" className="scroll-mt-28">
      {/* Phase 2 — sticky trip bar */}
      <div className="sticky top-20 z-20 border border-gray-200 bg-white shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Your trip</h2>
          <p className="text-sm text-gray-500">Pick dates to see room totals for your stay.</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 p-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Check-in</label>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => {
                setCheckIn(e.target.value);
                setDatesTouched(true);
              }}
              min={todayIso()}
              className={`w-full px-3 py-2.5 text-sm border bg-white focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 ${
                datesTouched && !checkIn ? 'border-amber-400' : 'border-gray-300'
              }`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Check-out</label>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => {
                setCheckOut(e.target.value);
                setDatesTouched(true);
              }}
              min={checkIn || todayIso()}
              className={`w-full px-3 py-2.5 text-sm border bg-white focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 ${
                datesTouched && !checkOut ? 'border-amber-400' : 'border-gray-300'
              }`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Adults</label>
            <div className="relative">
              <UsersIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="number"
                value={numAdults}
                onChange={(e) => {
                  const raw = parseInt(e.target.value, 10) || 1;
                  setNumAdults(capacity ? Math.min(raw, capacity.maxAdults) : Math.max(raw, 1));
                }}
                min="1"
                max={capacity ? capacity.maxAdults : undefined}
                className="w-full pl-8 pr-2 py-2.5 text-sm border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-red-600"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Children</label>
            <input
              type="number"
              value={numChildren}
              onChange={(e) => {
                const raw = parseInt(e.target.value, 10) || 0;
                setNumChildren(capacity ? Math.min(raw, capacity.maxChildren) : Math.max(raw, 0));
              }}
              min="0"
              max={capacity ? capacity.maxChildren : undefined}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-red-600"
            />
          </div>
          <div className="col-span-2 lg:col-span-1 flex items-end">
            <p className="w-full text-sm text-gray-600 py-2.5">
              {tripSummary || 'Add dates to unlock trip totals'}
            </p>
          </div>
        </div>
      </div>

      {/* Phase 3 — room rows */}
      <div className="mt-6 flex items-end justify-between gap-3 mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Available rooms</h3>
          <p className="text-sm text-gray-500">
            {hasDates ? tripSummary : 'From-prices shown — add dates for your total'}
          </p>
        </div>
      </div>

      <div className="border border-gray-200 divide-y divide-gray-100 bg-white">
        {roomTypes.map((room) => {
          const activeAmenities = AMENITY_LABELS.filter(([key]) => room[key]);
          const quantity = quantities[room.id] || 0;
          const lineTotal = hasDates ? (room.base_price || 0) * Math.max(quantity, 1) * nights : null;

          return (
            <div
              key={room.id}
              className={`flex flex-col sm:flex-row gap-4 p-4 sm:p-5 ${
                quantity > 0 ? 'bg-red-50/50' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => room.images?.length > 0 && setLightboxRoom(room)}
                disabled={!room.images?.length}
                className={`relative w-full sm:w-36 h-32 sm:h-28 flex-shrink-0 overflow-hidden bg-gray-100 ${
                  room.images?.length ? 'hover:opacity-90' : ''
                }`}
              >
                {room.primary_image ? (
                  <img src={room.primary_image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <HomeModernIcon className="w-8 h-8 text-gray-300" />
                  </div>
                )}
                {room.images?.length > 1 && (
                  <span className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5">
                    {room.images.length}
                  </span>
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-base">{room.name}</p>
                <p className="text-sm text-gray-600 mt-0.5">
                  Sleeps {room.max_adults} adult{room.max_adults === 1 ? '' : 's'}
                  {room.max_children > 0
                    ? ` · ${room.max_children} child${room.max_children === 1 ? '' : 'ren'}`
                    : ''}
                  {room.bed_type
                    ? ` · ${room.bed_count || 1} ${room.bed_type} bed${(room.bed_count || 1) === 1 ? '' : 's'}`
                    : ''}
                </p>
                {activeAmenities.length > 0 && (
                  <p className="mt-2 text-xs text-gray-500 line-clamp-1">
                    {activeAmenities.map(([, label]) => label).join(' · ')}
                  </p>
                )}
              </div>

              <div className="flex sm:flex-col sm:items-end justify-between sm:justify-center gap-3 sm:min-w-[9.5rem]">
                <div className="text-left sm:text-right">
                  <p className="font-semibold text-gray-900">
                    KSh {Number(room.base_price || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {hasDates ? `per night · ${nights} night${nights === 1 ? '' : 's'}` : 'per night'}
                  </p>
                  {hasDates && quantity > 0 && (
                    <p className="text-sm font-medium text-gray-900 mt-0.5">
                      KSh {lineTotal.toLocaleString()} trip
                    </p>
                  )}
                  {!hasDates && (
                    <p className="text-xs text-amber-700 mt-1">Add dates for totals</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-gray-300 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => adjustQuantity(room.id, -1)}
                      disabled={quantity === 0}
                      className="w-9 h-9 flex items-center justify-center text-gray-700 hover:bg-gray-50 disabled:text-gray-300"
                      aria-label={`Decrease ${room.name}`}
                    >
                      <MinusIcon className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-gray-900">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => adjustQuantity(room.id, 1)}
                      disabled={quantity === MAX_QUANTITY}
                      className="w-9 h-9 flex items-center justify-center text-gray-700 hover:bg-gray-50 disabled:text-gray-300"
                      aria-label={`Increase ${room.name}`}
                    >
                      <PlusIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selection summary */}
      <div className="mt-4 border border-gray-200 bg-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {selectedRows.length > 0 ? (
            <>
              <p className="text-sm font-semibold text-gray-900 mb-1">Your selection</p>
              <div className="space-y-0.5 text-sm text-gray-700">
                {selectedRows.map((row) => (
                  <div key={row.room.id}>
                    {row.quantity}× {row.room.name}
                    {hasDates && (
                      <span className="text-gray-500">
                        {' '}
                        · KSh {(row.room.base_price * row.quantity * nights).toLocaleString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {hasDates ? (
                <p className="mt-2 text-lg font-bold text-gray-900">
                  KSh {totalPrice.toLocaleString()}{' '}
                  <span className="text-sm font-normal text-gray-500">total</span>
                </p>
              ) : (
                <p className="mt-1 text-xs text-amber-700">Add dates to see your trip total.</p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">Select rooms to build your stay.</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleReserve}
          disabled={isSubmitting || selectedRows.length === 0}
          className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white font-semibold hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Requesting…' : 'Reserve'}
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        You’ll choose pay now or pay at the hotel on the next step.
      </p>

      {/* Phase 4 — sticky mobile CTA */}
      {selectedRows.length > 0 && (
        <div className="lg:hidden fixed bottom-16 inset-x-0 z-30 border-t border-gray-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-gray-500">
                {selectedRows.reduce((n, r) => n + r.quantity, 0)} room
                {selectedRows.reduce((n, r) => n + r.quantity, 0) === 1 ? '' : 's'}
                {hasDates ? ` · ${nights} night${nights === 1 ? '' : 's'}` : ''}
              </p>
              <p className="text-base font-bold text-gray-900">
                {hasDates ? `KSh ${totalPrice.toLocaleString()}` : 'Add dates'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleReserve}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60"
            >
              Reserve
            </button>
          </div>
        </div>
      )}

      <ImageLightbox
        images={lightboxRoom?.images || []}
        initialIndex={0}
        isOpen={!!lightboxRoom}
        onClose={() => setLightboxRoom(null)}
        title={lightboxRoom?.name}
      />
    </div>
  );
};

export default RoomTypesBookingTable;
