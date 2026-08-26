export const normalizeHostBooking = (booking) => {
  const checkIn = booking?.check_in || booking?.checkIn || '';
  const checkOut = booking?.check_out || booking?.checkOut || '';
  const hotelName = booking?.hotel_name || booking?.hotel?.name || booking?.bnb_listing_title || booking?.bnb_listing?.title || 'Property';
  const roomName = booking?.room_name || booking?.room_type?.name || '—';
  const guestName = booking?.traveler_name || booking?.guest_full_name || booking?.guest_name || booking?.guest || 'Guest';
  const totalAmount = Number(booking?.total_amount ?? booking?.amount ?? 0);
  const paymentMethod = booking?.payment_method || 'pay_at_premises';
  const paymentStatus = booking?.payment_status || 'unpaid';
  const needsApproval = booking?.status === 'pending' && paymentMethod === 'pay_at_premises';
  const needsPayment = booking?.status === 'pending' && paymentMethod === 'online';
  const requestStage = needsApproval
    ? 'Awaiting host approval'
    : needsPayment
      ? 'Awaiting guest payment'
      : booking?.status || 'pending';

  return {
    ...booking,
    check_in: checkIn,
    check_out: checkOut,
    checkIn,
    checkOut,
    hotel_name: hotelName,
    room_name: roomName,
    guest_name: guestName,
    guest: guestName,
    amount: totalAmount,
    total_amount: totalAmount,
    payment_method: paymentMethod,
    payment_status: paymentStatus,
    needsApproval,
    needsPayment,
    requestStage,
  };
};

export const normalizeHostBookings = (bookings = []) => {
  if (!Array.isArray(bookings)) return [];
  return bookings.map(normalizeHostBooking);
};

export const normalizeHostReview = (review) => {
  const guest = review?.traveler_name || review?.guest || 'Guest';
  const hotel = review?.hotel_name || review?.bnb_listing_title || review?.hotel || 'Property';
  const date = review?.created_at ? new Date(review.created_at).toLocaleDateString() : (review?.date || '');
  return {
    ...review,
    guest,
    hotel,
    date,
  };
};

export const normalizeHostReviews = (reviews = []) => {
  if (!Array.isArray(reviews)) return [];
  return reviews.map(normalizeHostReview);
};

export const calculateHostStats = ({ hotels = [], bookings = [], reviews = [] }) => {
  const safeHotels = Array.isArray(hotels) ? hotels : [];
  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const safeReviews = Array.isArray(reviews) ? reviews : [];

  const totalBookings = safeBookings.length;
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  const monthlyRevenue = safeBookings.reduce((sum, booking) => {
    const createdAt = booking?.created_at ? new Date(booking.created_at) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) return sum;
    if (createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear()) {
      return sum + Number(booking.total_amount || booking.amount || 0);
    }
    return sum;
  }, 0);

  const averageRating = safeReviews.length > 0
    ? safeReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / safeReviews.length
    : 0;

  const totalRooms = safeHotels.reduce((sum, hotel) => {
    const roomTypes = Array.isArray(hotel?.room_types) ? hotel.room_types.length : 0;
    return sum + roomTypes;
  }, 0);

  const occupiedRooms = safeBookings.filter((booking) => {
    if (booking.status !== 'confirmed') return false;
    const checkIn = booking.check_in || booking.checkIn;
    const checkOut = booking.check_out || booking.checkOut;
    return Boolean(checkIn && checkOut && checkIn <= today && checkOut >= today);
  }).length;

  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  const todayCheckIns = safeBookings.filter((booking) => booking.status === 'confirmed' && (booking.check_in || booking.checkIn) === today).length;
  const todayCheckOuts = safeBookings.filter((booking) => booking.status === 'confirmed' && (booking.check_out || booking.checkOut) === today).length;
  const pendingBookings = safeBookings.filter((booking) => booking.status === 'pending').length;

  return {
    totalBookings,
    monthlyRevenue,
    averageRating: Math.round(averageRating * 10) / 10,
    occupancyRate,
    totalRooms,
    availableRooms: Math.max(totalRooms - occupiedRooms, 0),
    pendingBookings,
    todayCheckIns,
    todayCheckOuts,
  };
};
