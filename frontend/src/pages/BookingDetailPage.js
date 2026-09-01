import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowDownTrayIcon,
  CheckIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  ShieldCheckIcon,
  StarIcon as StarIconOutline,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { bookingsAPI, reviewsAPI } from '../services/api';
import PaymentModal from '../components/payment/PaymentModal';
import { toast } from 'react-hot-toast';

const BookingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSavingPaymentChoice, setIsSavingPaymentChoice] = useState(false);
  const [isCompletingReservation, setIsCompletingReservation] = useState(false);
  const [successState, setSuccessState] = useState(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState(null);
  const [selectedPaymentChoice, setSelectedPaymentChoice] = useState('online');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const data = await bookingsAPI.getBooking(id);
        setBooking(data);
      } catch (_) {
        setError('Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  useEffect(() => {
    const run = async () => {
      const hotelId = booking?.hotel?.id;
      const bnbId = booking?.bnb_listing?.id;
      if (!hotelId && !bnbId) return;
      try {
        const [reviewsData, statsData] = hotelId
          ? await Promise.all([
              reviewsAPI.getHotelReviews(hotelId),
              reviewsAPI.getHotelReviewStats(hotelId),
            ])
          : await Promise.all([
              reviewsAPI.getBnBReviews(bnbId),
              reviewsAPI.getBnBReviewStats(bnbId),
            ]);
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
        setReviewStats(statsData || null);
      } catch (_) {
        // non-blocking
      }
    };
    run();
  }, [booking?.hotel?.id, booking?.bnb_listing?.id]);

  const canWriteReview = useMemo(() => {
    if (!booking || booking.review) return false;
    if (!['confirmed', 'completed'].includes(booking.status)) return false;
    if (!booking.check_out) return false;
    return new Date(booking.check_out) < new Date();
  }, [booking]);

  const handleSubmitReview = async () => {
    if (!booking || reviewRating < 1) return;
    setIsSubmittingReview(true);
    try {
      const created = await reviewsAPI.createReview({
        booking_id: booking.id,
        rating: reviewRating,
        title: reviewTitle,
        comment: reviewComment,
      });
      setBooking((prev) => ({
        ...prev,
        review: {
          id: created.id,
          rating: created.rating,
          title: created.title,
          comment: created.comment,
          created_at: created.created_at,
        },
      }));
      setShowReviewForm(false);
      toast.success('Thanks for your review!');
      const hotelId = booking?.hotel?.id;
      const bnbId = booking?.bnb_listing?.id;
      const [reviewsData, statsData] = hotelId
        ? await Promise.all([reviewsAPI.getHotelReviews(hotelId), reviewsAPI.getHotelReviewStats(hotelId)])
        : await Promise.all([reviewsAPI.getBnBReviews(bnbId), reviewsAPI.getBnBReviewStats(bnbId)]);
      setReviews(Array.isArray(reviewsData) ? reviewsData : []);
      setReviewStats(statsData || null);
    } catch (err) {
      const message = err?.response?.data?.non_field_errors?.[0]
        || err?.response?.data?.booking_id?.[0]
        || err?.response?.data?.detail
        || 'Could not submit your review';
      toast.error(message);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  useEffect(() => {
    if (!booking?.payment_method) return;
    setSelectedPaymentChoice(booking.payment_method);
  }, [booking?.payment_method]);

  const formatDate = (value) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (_) {
      return value;
    }
  };

  const formatMoney = (currency, value) => {
    const code = currency || 'KES';
    const numeric = Number(value || 0);
    if (code === 'KES') {
      return `KES ${numeric.toLocaleString()}`;
    }
    return `${code} ${numeric.toLocaleString()}`;
  };

  const formatICSDate = (value) => {
    try {
      const date = new Date(value);
      const year = date.getFullYear();
      const month = `${date.getMonth() + 1}`.padStart(2, '0');
      const day = `${date.getDate()}`.padStart(2, '0');
      return `${year}${month}${day}`;
    } catch (_) {
      return '';
    }
  };

  const handleCopyBookingRef = async () => {
    const ref = `MSAFIRI-BOOKING-${booking.id}`;
    try {
      await navigator.clipboard.writeText(ref);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 1800);
      toast.success('Booking reference copied');
    } catch (_) {
      toast.error('Could not copy booking reference');
    }
  };

  const handleDownloadCalendar = () => {
    if (!booking?.check_in || !booking?.check_out) {
      toast.error('Missing booking dates');
      return;
    }
    const title = `Msafiri Stay - ${stayTitle}`;
    const location = [stayAddress, stayCity, stayCountry].filter(Boolean).join(', ');
    const description = `Booking #${booking.id} on Msafiri Space`;
    const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const dtStart = formatICSDate(booking.check_in);
    const dtEnd = formatICSDate(booking.check_out);
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Msafiri Space//Booking Calendar//EN',
      'BEGIN:VEVENT',
      `UID:booking-${booking.id}@msafirispace.local`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `msafiri-booking-${booking.id}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const bookingStatusClasses = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-emerald-100 text-emerald-700';
      case 'pending':
        return 'bg-amber-100 text-amber-800';
      case 'cancelled':
        return 'bg-rose-100 text-rose-700';
      case 'completed':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const paymentStatusClasses = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-100 text-emerald-700';
      case 'pending_payment':
        return 'bg-amber-100 text-amber-800';
      case 'unpaid':
        return 'bg-rose-100 text-rose-700';
      case 'partially_paid':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handlePaymentSuccess = async () => {
    toast.success('Payment initiated. We are verifying your payment.');
    setSuccessState({
      type: 'payment',
      title: 'Payment started successfully',
      message: 'Your payment window is open or your payment has started processing. Once payment goes through, your booking will be confirmed.',
    });
    try {
      const refreshed = await bookingsAPI.getBooking(id);
      setBooking(refreshed);
    } catch (_) {
      // ignore refresh failures after success feedback
    }
  };

  const handleCancelBooking = async () => {
    if (!booking) return;
    try {
      setIsCancelling(true);
      await bookingsAPI.cancelBooking(booking.id);
      toast.success('Booking cancelled successfully');
      const refreshed = await bookingsAPI.getBooking(booking.id);
      setBooking(refreshed);
      setShowCancelModal(false);
    } catch (_) {
      toast.error('Failed to cancel booking');
    } finally {
      setIsCancelling(false);
    }
  };

  const handlePaymentChoiceChange = async (nextChoice) => {
    if (!booking || booking.status !== 'pending' || selectedPaymentChoice === nextChoice) {
      setSelectedPaymentChoice(nextChoice);
      return;
    }

    const previousChoice = selectedPaymentChoice;
    setSelectedPaymentChoice(nextChoice);
    setIsSavingPaymentChoice(true);
    try {
      const updatedBooking = await bookingsAPI.updateBooking(booking.id, {
        payment_method: nextChoice,
      });
      setBooking(updatedBooking);
      if (nextChoice === 'online') {
        toast.success('Payment option changed to Pay Now.');
      } else {
        toast.success('Payment option changed to Pay at Hotel.');
      }
    } catch (_) {
      setSelectedPaymentChoice(previousChoice);
      toast.error('Could not update payment choice');
    } finally {
      setIsSavingPaymentChoice(false);
    }
  };

  const handleCompleteReservation = async () => {
    if (!booking) return;
    setIsCompletingReservation(true);
    try {
      const refreshedBooking = await bookingsAPI.confirmPayAtPremises(booking.id);
      setBooking(refreshedBooking);
      toast.success('Reservation confirmed! Pay at check-in.');
      setSuccessState({
        type: 'reservation',
        title: 'Reservation confirmed',
        message: 'Your stay is confirmed. Pay in cash or card when you arrive at the property.',
      });
    } catch (err) {
      const message = err?.response?.data?.detail || 'Could not complete reservation';
      toast.error(message);
    } finally {
      setIsCompletingReservation(false);
    }
  };

  const timeline = useMemo(() => {
    const status = booking?.status;
    const paymentStatus = booking?.payment_status;
    const hostApproval = booking?.host_approval_status;
    const isCancelled = status === 'cancelled';
    const isHostApproved = hostApproval === 'approved';
    return [
      { label: 'Requested', complete: true, current: false },
      {
        label: 'Host Confirmation',
        complete: isHostApproved,
        current: hostApproval === 'pending' && !isCancelled,
      },
      {
        label: 'Payment',
        complete: paymentStatus === 'paid' || paymentStatus === 'partially_paid',
        current: isHostApproved && ['pending_payment', 'unpaid'].includes(paymentStatus) && status === 'pending' && !isCancelled,
      },
      {
        label: 'Confirmed',
        complete: status === 'confirmed' || status === 'completed',
        current: status === 'confirmed' && !isCancelled,
      },
      {
        label: 'Completed',
        complete: status === 'completed',
        current: status === 'completed' && !isCancelled,
      },
    ];
  }, [booking?.status, booking?.payment_status, booking?.host_approval_status]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-full max-w-6xl px-4 py-6 sm:py-8 animate-pulse">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
            <div className="h-4 w-28 bg-gray-200 rounded mb-3" />
            <div className="h-8 w-56 bg-gray-200 rounded mb-3" />
            <div className="h-4 w-80 bg-gray-200 rounded" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 h-44" />
              <div className="bg-white rounded-2xl border border-gray-100 p-6 h-52" />
            </div>
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 h-80" />
              <div className="bg-white rounded-2xl border border-gray-100 h-44" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Booking Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The booking you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate('/dashboard', { state: { initialTab: 'bookings' } })}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Back to Bookings
          </button>
        </div>
      </div>
    );
  }

  const stayTitle = booking.bnb_listing?.title || booking.hotel?.name || 'Accommodation';
  const stayCity = booking.bnb_listing?.city || booking.hotel?.city;
  const stayCountry = booking.bnb_listing?.country || booking.hotel?.country;
  const stayAddress = booking.bnb_listing?.address || booking.hotel?.address;
  const stayDescription = booking.bnb_listing?.description || booking.room_type?.description || '';
  const bnbImage = booking.bnb_listing?.primary_image || (
    Array.isArray(booking.bnb_listing?.images) && booking.bnb_listing.images.length > 0
      ? (typeof booking.bnb_listing.images[0] === 'string'
          ? booking.bnb_listing.images[0]
          : booking.bnb_listing.images[0]?.image)
      : null
  );
  const hotelImage = booking.hotel?.primary_image || null;
  const stayImage = bnbImage || hotelImage || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="100%" height="100%" fill="%23e5e7eb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%236b7280" font-family="Arial" font-size="28">Property image</text></svg>';
  const stayLink = booking.bnb_listing ? `/bnb/${booking.bnb_listing.id}` : booking.hotel ? `/hotel/${booking.hotel.id}` : null;

  const nights = Number(booking.total_nights || 0);
  const nightlyPrice = Number(booking.nightly_price || 0);
  const totalAmount = Number(booking.total_amount || 0);
  const depositAmount = Number(booking.deposit_amount || 0);
  const roomSubtotal = nightlyPrice * nights;
  const serviceAndFees = Math.max(totalAmount - roomSubtotal, 0);

  const isHostApproved = booking.host_approval_status === 'approved';
  const canPayOnline = isHostApproved && selectedPaymentChoice === 'online' && ['pending_payment', 'unpaid'].includes(booking.payment_status) && booking.status === 'pending';
  const canCompleteReservation = isHostApproved && selectedPaymentChoice === 'pay_at_premises' && booking.status === 'pending';
  const canCancel = booking.status === 'pending';
  const isOnlineChoice = selectedPaymentChoice === 'online';

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-10">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Booking #{booking.id}</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Your Reservation</h1>
              <p className="mt-1 text-sm text-gray-600">{formatDate(booking.check_in)} - {formatDate(booking.check_out)} ({booking.total_nights} nights)</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${bookingStatusClasses(booking.status)}`}>
                {booking.status}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${paymentStatusClasses(booking.payment_status)}`}>
                {booking.payment_status.replace('_', ' ')}
              </span>
              <button
                type="button"
                onClick={handleCopyBookingRef}
                className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                {copiedRef ? <CheckIcon className="w-4 h-4 text-emerald-600" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
                {copiedRef ? 'Copied!' : 'Copy Ref'}
              </button>
              <button
                type="button"
                onClick={handleDownloadCalendar}
                className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                Add To Calendar
              </button>
            </div>
          </div>

          {booking.status === 'cancelled' && booking.host_approval_status === 'declined' && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <XCircleIcon className="w-5 h-5 flex-shrink-0" />
                This place isn't available for your selected dates.
              </div>
              <p className="mt-1 text-sm text-rose-700">
                The host confirmed there's no vacancy for these dates. No payment was taken — please continue your search for another option.
              </p>
              <button
                type="button"
                onClick={() => navigate(booking.hotel ? '/hotels' : '/bnbs')}
                className="mt-3 px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700"
              >
                Continue Searching
              </button>
            </div>
          )}

          {booking.status === 'cancelled' && booking.host_approval_status !== 'declined' && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-700 text-sm">
              <XCircleIcon className="w-5 h-5" />
              This booking is cancelled.
            </div>
          )}

          {successState && (
            <div className={`mt-4 rounded-2xl border p-4 ${
              successState.type === 'payment'
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-blue-200 bg-blue-50'
            }`}>
              <div className="flex items-start gap-3">
                <CheckCircleIcon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
                  successState.type === 'payment' ? 'text-emerald-600' : 'text-blue-600'
                }`} />
                <div className="flex-1">
                  <p className={`font-semibold ${
                    successState.type === 'payment' ? 'text-emerald-900' : 'text-blue-900'
                  }`}>
                    {successState.title}
                  </p>
                  <p className={`mt-1 text-sm ${
                    successState.type === 'payment' ? 'text-emerald-800' : 'text-blue-800'
                  }`}>
                    {successState.message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSuccessState(null)}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-3">
            {timeline.map((item) => (
              <div key={item.label} className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-center gap-2 mb-1">
                  {item.complete ? (
                    <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                  ) : item.current ? (
                    <ClockIcon className="w-4 h-4 text-amber-600" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-gray-300" />
                  )}
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{item.label}</p>
                </div>
                <p className={`text-sm font-semibold ${item.complete ? 'text-emerald-700' : item.current ? 'text-amber-700' : 'text-gray-700'}`}>
                  {item.complete ? 'Done' : item.current ? 'In progress' : 'Pending'}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking Summary</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Guests</p>
                  <p className="text-gray-900 font-semibold">
                    {booking.num_adults} adult{booking.num_adults !== 1 ? 's' : ''}, {booking.num_children} child{booking.num_children !== 1 ? 'ren' : ''}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Payment Method</p>
                  <p className="text-gray-900 font-semibold">{booking.payment_method === 'online' ? 'Online Payment' : 'Pay At Hotel'}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4 sm:col-span-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Guest Contact</p>
                  <p className="text-gray-900">{booking.guest_full_name}</p>
                  <p className="text-gray-600 text-sm">{booking.guest_email}</p>
                  {booking.guest_phone && <p className="text-gray-600 text-sm">{booking.guest_phone}</p>}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Price Breakdown</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">{formatMoney(booking.currency, booking.nightly_price)} x {nights} night(s)</span>
                  <span className="text-gray-900">{formatMoney(booking.currency, roomSubtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Service and fees</span>
                  <span className="text-gray-900">{formatMoney(booking.currency, serviceAndFees)}</span>
                </div>
                {depositAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Deposit</span>
                    <span className="text-gray-900">{formatMoney(booking.currency, depositAmount)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between text-lg font-bold text-gray-900">
                  <span>Total</span>
                  <span>{formatMoney(booking.currency, totalAmount)}</span>
                </div>
              </div>

              {booking.special_requests && (
                <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Special Requests</p>
                  <p className="text-gray-700 text-sm">{booking.special_requests}</p>
                </div>
              )}
            </div>

            {(booking.hotel || booking.bnb_listing) && (booking.review || canWriteReview) && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                  {booking.review ? 'Your Review' : 'Share Your Experience'}
                </h2>

                {booking.review ? (
                  <div className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center gap-0.5 mb-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        n <= booking.review.rating ? (
                          <StarIconSolid key={n} className="w-5 h-5 text-yellow-400" />
                        ) : (
                          <StarIconOutline key={n} className="w-5 h-5 text-gray-300" />
                        )
                      ))}
                    </div>
                    {booking.review.title && (
                      <p className="text-sm font-semibold text-gray-900">{booking.review.title}</p>
                    )}
                    {booking.review.comment && (
                      <p className="text-sm text-gray-700 mt-1">{booking.review.comment}</p>
                    )}
                  </div>
                ) : showReviewForm ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setReviewRating(n)}
                          aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
                        >
                          {n <= reviewRating ? (
                            <StarIconSolid className="w-7 h-7 text-yellow-400" />
                          ) : (
                            <StarIconOutline className="w-7 h-7 text-gray-300" />
                          )}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Title (optional)"
                      value={reviewTitle}
                      onChange={(e) => setReviewTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                    <textarea
                      placeholder="Tell other travelers about your stay..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowReviewForm(false)}
                        className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmitReview}
                        disabled={reviewRating < 1 || isSubmittingReview}
                        className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60"
                      >
                        {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(true)}
                    className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700"
                  >
                    Write a Review
                  </button>
                )}
              </div>
            )}

            {(booking.hotel || booking.bnb_listing) && reviewStats && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Recent Feedback</h2>
                <p className="text-sm text-gray-600 mb-3">
                  Average rating: <span className="font-semibold text-gray-900">{reviewStats.average_rating || '—'}</span> ({reviewStats.total_reviews || 0} reviews)
                </p>
                {reviews.length > 0 ? (
                  <div className="space-y-3">
                    {reviews.slice(0, 2).map((review) => (
                      <div key={review.id} className="rounded-lg border border-gray-200 p-3">
                        <p className="text-sm font-semibold text-gray-900">{review.traveler_name || 'Anonymous'}</p>
                        <p className="text-xs text-gray-500">{new Date(review.created_at).toLocaleDateString()}</p>
                        <p className="text-sm text-gray-700 mt-1">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No recent reviews available.</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <img
                src={stayImage}
                alt={stayTitle}
                className="w-full h-44 object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="100%" height="100%" fill="%23e5e7eb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%236b7280" font-family="Arial" font-size="28">Image unavailable</text></svg>';
                }}
              />
              <div className="p-5">
                <h2 className="text-lg font-bold text-gray-900">{stayTitle}</h2>
                {(stayCity || stayCountry) && (
                  <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                    <MapPinIcon className="w-4 h-4" />
                    {[stayCity, stayCountry].filter(Boolean).join(', ')}
                  </p>
                )}
                {stayAddress && <p className="text-xs text-gray-500 mt-1">{stayAddress}</p>}
                {stayDescription && <p className="text-sm text-gray-600 mt-3 line-clamp-3">{stayDescription}</p>}
                {stayLink && (
                  <button
                    type="button"
                    onClick={() => navigate(stayLink)}
                    className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    View Property
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              {booking.status === 'pending' && booking.host_approval_status === 'pending' && (
                <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <div className="flex items-start gap-3">
                    <ClockIcon className="mt-0.5 h-6 w-6 flex-shrink-0 text-amber-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-amber-900">Waiting for host confirmation</h3>
                      <p className="mt-1 text-sm text-amber-800">
                        We've sent your reservation request to the host to confirm availability. Once they respond,
                        you'll be prompted to choose how to pay. You can cancel this request at any time before then.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {booking.status === 'pending' && booking.host_approval_status === 'approved' && (
                <div className="mb-5 overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-slate-50 via-white to-slate-100">
                  <div className="border-b border-gray-200 px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">Payment Choice</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          The host confirmed this is available. Choose how you want to pay.
                        </p>
                      </div>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        isOnlineChoice ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {isOnlineChoice ? 'Pay Now selected' : 'Pay at Hotel selected'}
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="space-y-3">
                      <label className={`flex gap-3 rounded-2xl border p-4 cursor-pointer transition-all ${
                        isOnlineChoice
                          ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="booking-payment-choice"
                          value="online"
                          checked={isOnlineChoice}
                          onChange={(e) => handlePaymentChoiceChange(e.target.value)}
                          disabled={isSavingPaymentChoice}
                          className="mt-1 h-4 w-4"
                        />
                        <span className="flex-1">
                          <span className="flex items-center justify-between gap-3">
                            <span className="block text-lg font-semibold text-gray-900">Pay Now</span>
                            <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
                              Instant next step
                            </span>
                          </span>
                          <span className="mt-1 block text-sm text-gray-600">
                            Pay online now and confirm the booking once payment goes through.
                          </span>
                        </span>
                      </label>

                      <label className={`flex gap-3 rounded-2xl border p-4 cursor-pointer transition-all ${
                        !isOnlineChoice
                          ? 'border-blue-300 bg-blue-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="booking-payment-choice"
                          value="pay_at_premises"
                          checked={!isOnlineChoice}
                          onChange={(e) => handlePaymentChoiceChange(e.target.value)}
                          disabled={isSavingPaymentChoice}
                          className="mt-1 h-4 w-4"
                        />
                        <span className="flex-1">
                          <span className="flex items-center justify-between gap-3">
                            <span className="block text-lg font-semibold text-gray-900">Pay at Hotel</span>
                            <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-200">
                              Confirm now, pay at check-in
                            </span>
                          </span>
                          <span className="mt-1 block text-sm text-gray-600">
                            Lock in your reservation now and pay in cash or card when you arrive.
                          </span>
                        </span>
                      </label>
                    </div>

                    <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                      isOnlineChoice
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-blue-200 bg-blue-50 text-blue-800'
                    }`}>
                      <div className="flex gap-2">
                        {isOnlineChoice ? (
                          <ShieldCheckIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
                        ) : (
                          <ClockIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
                        )}
                        <div>
                          <p className="font-semibold">
                            {isOnlineChoice ? 'What happens next?' : 'What happens next?'}
                          </p>
                          <p className="mt-1">
                            {isOnlineChoice
                              ? 'Click Complete Payment below to open the payment window and finish your booking.'
                              : 'Click Complete Reservation below to confirm your stay — no payment is taken now.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {isSavingPaymentChoice && (
                      <p className="mt-3 text-sm text-gray-500">Saving your payment choice...</p>
                    )}
                  </div>
                </div>
              )}

              <h3 className="text-sm uppercase tracking-wide text-gray-500 mb-3">Actions</h3>

              <div className="space-y-3">
                {canPayOnline && (
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full bg-emerald-600 text-white py-3 px-4 rounded-xl hover:bg-emerald-700 font-semibold transition-colors"
                  >
                    Complete Payment
                  </button>
                )}

                {canCompleteReservation && (
                  <button
                    type="button"
                    onClick={handleCompleteReservation}
                    disabled={isCompletingReservation || isSavingPaymentChoice}
                    className="w-full bg-slate-100 text-slate-800 py-2.5 px-4 rounded-xl hover:bg-slate-200 font-semibold transition-colors disabled:opacity-60"
                  >
                    {isCompletingReservation ? 'Completing...' : 'Complete Reservation'}
                  </button>
                )}

                {canCancel && (
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(true)}
                    className="w-full border border-rose-300 text-rose-700 py-2.5 px-4 rounded-xl hover:bg-rose-50 font-semibold transition-colors"
                  >
                    Cancel Booking
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => navigate('/dashboard', { state: { initialTab: 'bookings' } })}
                  className="w-full border border-gray-300 text-gray-700 py-2.5 px-4 rounded-xl hover:bg-gray-50 font-semibold transition-colors"
                >
                  View All My Bookings
                </button>
              </div>
            </div>

            {isHostApproved && booking.status === 'pending' && selectedPaymentChoice === 'online' && ['pending_payment', 'unpaid'].includes(booking.payment_status) && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                Your booking is waiting for payment. Complete payment to confirm it.
              </div>
            )}

            {isHostApproved && booking.status === 'pending' && selectedPaymentChoice === 'pay_at_premises' && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 flex gap-2">
                <ClockIcon className="w-5 h-5 flex-shrink-0" />
                You chose to pay at the hotel on arrival. Click Complete Reservation above to confirm your stay.
              </div>
            )}
          </div>
        </div>
      </div>

      {canPayOnline && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-gray-200 bg-white p-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-lg font-bold text-gray-900">{formatMoney(booking.currency, totalAmount)}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPaymentModal(true)}
              className="px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
            >
              Pay Now
            </button>
          </div>
        </div>
      )}

      {showCancelModal && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Cancel Booking?</h3>
            <p className="text-sm text-gray-600 mb-6">
              This action will cancel your reservation. If payment was made, refund handling follows your policy.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-60"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={isCancelling}
                className="flex-1 rounded-lg bg-rose-600 px-4 py-2.5 text-white font-semibold hover:bg-rose-700 disabled:opacity-60"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

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
