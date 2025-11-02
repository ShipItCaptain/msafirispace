import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingsAPI, reviewsAPI } from '../services/api';
import PaymentModal from '../components/payment/PaymentModal';

const BookingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState(null);

  useEffect(() => {
    fetchBooking();
    if (booking?.hotel?.id) {
      fetchReviews();
    }
  }, [id, booking?.hotel?.id]);

  const fetchBooking = async () => {
    try {
      const data = await bookingsAPI.getBooking(id);
      setBooking(data);
    } catch (err) {
      setError('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const [reviewsData, statsData] = await Promise.all([
        reviewsAPI.getHotelReviews(booking.hotel.id),
        reviewsAPI.getHotelReviewStats(booking.hotel.id)
      ]);
      setReviews(reviewsData);
      setReviewStats(statsData);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    }
  };

  const handlePaymentSuccess = (intent) => {
    alert('Payment initiated successfully! You will receive a confirmation once payment is verified.');
    fetchBooking(); // Refresh booking status
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-100';
      case 'unpaid': return 'text-red-600 bg-red-100';
      case 'partially_paid': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Booking Not Found</h1>
          <p className="text-gray-600 mb-4">{error || 'The booking you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate('/bookings')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Bookings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold">Booking #{booking.id}</h1>
                <p className="text-blue-100 mt-1">
                  {booking.check_in} to {booking.check_out} • {booking.total_nights} nights
                </p>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </span>
                <p className="text-blue-100 mt-2">
                  Payment: <span className={`px-2 py-1 rounded text-xs ${getPaymentStatusColor(booking.payment_status)}`}>
                    {booking.payment_status.replace('_', ' ').toUpperCase()}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Booking Details */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Booking Details</h2>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900">Room Information</h3>
                    <p className="text-gray-600">{booking.room_type?.name || 'Room Type'}</p>
                    <p className="text-sm text-gray-500">
                      {booking.num_adults} adult{booking.num_adults !== 1 ? 's' : ''}, {booking.num_children} child{booking.num_children !== 1 ? 'ren' : ''}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900">Guest Information</h3>
                    <p className="text-gray-600">{booking.guest_full_name}</p>
                    <p className="text-gray-600">{booking.guest_email}</p>
                    {booking.guest_phone && <p className="text-gray-600">{booking.guest_phone}</p>}
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900">Pricing</h3>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Nightly rate:</span>
                        <span>{booking.currency} {booking.nightly_price}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total nights:</span>
                        <span>{booking.total_nights}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-lg">
                        <span>Total amount:</span>
                        <span>{booking.currency} {booking.total_amount}</span>
                      </div>
                    </div>
                  </div>

                  {booking.special_requests && (
                    <div>
                      <h3 className="font-medium text-gray-900">Special Requests</h3>
                      <p className="text-gray-600">{booking.special_requests}</p>
                    </div>
                  )}

                  {/* Payment Actions */}
                  {booking.payment_status === 'unpaid' && booking.status === 'confirmed' && (
                    <div className="pt-4">
                      <button
                        onClick={() => setShowPaymentModal(true)}
                        className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
                      >
                        Pay Now
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Hotel Information & Reviews */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Hotel Information</h2>
                
                {booking.hotel && (
                  <div className="mb-6">
                    <h3 className="font-medium text-gray-900">{booking.hotel.name}</h3>
                    <p className="text-gray-600">{booking.hotel.city}, {booking.hotel.country}</p>
                    
                    {reviewStats && (
                      <div className="mt-4 p-4 bg-gray-50 rounded">
                        <div className="flex items-center mb-2">
                          <span className="text-2xl font-bold text-yellow-500">
                            ★ {reviewStats.average_rating}
                          </span>
                          <span className="ml-2 text-gray-600">
                            ({reviewStats.total_reviews} reviews)
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          {[5, 4, 3, 2, 1].map(rating => (
                            <div key={rating} className="flex items-center">
                              <span className="w-8 text-sm">{rating}★</span>
                              <div className="flex-1 mx-2 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-yellow-400 h-2 rounded-full"
                                  style={{
                                    width: `${(reviewStats.rating_distribution[rating] / reviewStats.total_reviews) * 100}%`
                                  }}
                                ></div>
                              </div>
                              <span className="w-8 text-sm text-gray-600">
                                {reviewStats.rating_distribution[rating] || 0}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Recent Reviews */}
                {reviews.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Recent Reviews</h3>
                    <div className="space-y-3">
                      {reviews.slice(0, 3).map(review => (
                        <div key={review.id} className="border-l-4 border-blue-500 pl-4">
                          <div className="flex items-center mb-1">
                            <span className="font-medium text-sm">{review.traveler_name}</span>
                            <span className="ml-2 text-yellow-500">
                              {'★'.repeat(review.rating)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{review.comment}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(review.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        booking={booking}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
};

export default BookingDetailPage;
