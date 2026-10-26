import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ClipboardDocumentIcon,
  ClockIcon,
  EllipsisHorizontalIcon,
  MapPinIcon,
  ShieldCheckIcon,
  StarIcon as StarIconOutline,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { bookingsAPI, reviewsAPI, getApiErrorDetails } from '../services/api';
import PaymentModal from '../components/payment/PaymentModal';
import MessageThread from '../components/messaging/MessageThread';
import { toast } from 'react-hot-toast';

const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="100%" height="100%" fill="%23e5e7eb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%236b7280" font-family="Arial" font-size="28">Property image</text></svg>';

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

const formatShortDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch (_) {
    return value;
  }
};

const formatMoney = (currency, value) => {
  const code = currency || 'KES';
  const numeric = Number(value || 0);
  if (code === 'KES') return `KES ${numeric.toLocaleString()}`;
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

const BookingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorKind, setErrorKind] = useState(null); // 'not_found' | 'network' | 'forbidden' | 'generic'
  const [reloadKey, setReloadKey] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSavingPaymentChoice, setIsSavingPaymentChoice] = useState(false);
  const [isCompletingReservation, setIsCompletingReservation] = useState(false);
  const [successState, setSuccessState] = useState(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState(null);
  const [selectedPaymentChoice, setSelectedPaymentChoice] = useState('online');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError('');
        setErrorKind(null);
        const data = await bookingsAPI.getBooking(id);
        if (!cancelled) setBooking(data);
      } catch (err) {
        if (cancelled) return;
        const status = err?.response?.status;
        if (status === 404) {
          setErrorKind('not_found');
          setError("We couldn't find this trip. It may have been removed, or you’re signed in with a different account.");
        } else if (status === 403) {
          setErrorKind('forbidden');
          setError("You don’t have access to this trip.");
        } else if (!err?.response) {
          setErrorKind('network');
          setError('Connection issue. Check your network and try again.');
        } else {
          setErrorKind('generic');
          setError(getApiErrorDetails(err, 'Something went wrong loading this trip.').message);
        }
        setBooking(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

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

  useEffect(() => {
    if (!booking?.payment_method) return;
    setSelectedPaymentChoice(booking.payment_method);
  }, [booking?.payment_method]);

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
      const message =
        err?.response?.data?.non_field_errors?.[0] ||
        err?.response?.data?.booking_id?.[0] ||
        err?.response?.data?.detail ||
        'Could not submit your review';
      toast.error(message);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleCopyBookingRef = async () => {
    if (!booking) return;
    const ref = `MSAFIRI-BOOKING-${booking.id}`;
    try {
      await navigator.clipboard.writeText(ref);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 1800);
      toast.success('Booking reference copied');
      setMenuOpen(false);
    } catch (_) {
      toast.error('Could not copy booking reference');
    }
  };

  const handleDownloadCalendar = () => {
    if (!booking?.check_in || !booking?.check_out) {
      toast.error('Missing booking dates');
      return;
    }
    const stayTitle = booking.bnb_listing?.title || booking.hotel?.name || 'Accommodation';
    const stayCity = booking.bnb_listing?.city || booking.hotel?.city;
    const stayCountry = booking.bnb_listing?.country || booking.hotel?.country;
    const stayAddress = booking.bnb_listing?.address || booking.hotel?.address;
    const title = `Msafiri Stay - ${stayTitle}`;
    const location = [stayAddress, stayCity, stayCountry].filter(Boolean).join(', ');
    const description = `Booking #${booking.id} on Msafiri Space`;
    const dtStamp = `${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
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
    setMenuOpen(false);
  };

  const handlePaymentSuccess = async () => {
    toast.success('Payment initiated. We are verifying your payment.');
    setSuccessState({
      type: 'payment',
      title: 'Payment started successfully',
      message:
        'Your payment window is open or your payment has started processing. Once payment goes through, your booking will be confirmed.',
    });
    try {
      const refreshed = await bookingsAPI.getBooking(id);
      setBooking(refreshed);
    } catch (_) {
      // ignore
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-14 lg:pt-20">
        <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse space-y-4" aria-busy="true">
          <div className="h-8 w-48 bg-gray-200" />
          <div className="h-40 bg-white border border-gray-200" />
          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 h-64 bg-white border border-gray-200" />
            <div className="lg:col-span-2 h-64 bg-white border border-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    const title =
      errorKind === 'network'
        ? 'Couldn’t load this trip'
        : errorKind === 'forbidden'
          ? 'No access'
          : 'Trip not found';
    return (
      <div className="min-h-screen bg-gray-50 pt-14 lg:pt-20 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-3">{title}</h1>
          <p className="text-gray-600 mb-6">
            {error || 'The trip you are looking for does not exist.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {(errorKind === 'network' || errorKind === 'generic') && (
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="px-4 py-2.5 bg-red-600 text-white font-semibold hover:bg-red-700"
              >
                Try again
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/dashboard', { state: { initialTab: 'bookings' } })}
              className="px-4 py-2.5 border border-gray-300 text-gray-800 font-medium hover:bg-gray-50"
            >
              Back to Trips
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stayTitle = booking.bnb_listing?.title || booking.hotel?.name || 'Accommodation';
  const stayCity = booking.bnb_listing?.city || booking.hotel?.city;
  const stayCountry = booking.bnb_listing?.country || booking.hotel?.country;
  const stayAddress = booking.bnb_listing?.address || booking.hotel?.address;
  const stayPlace = [stayCity, stayCountry].filter(Boolean).join(', ');
  const bnbImage =
    booking.bnb_listing?.primary_image ||
    (Array.isArray(booking.bnb_listing?.images) && booking.bnb_listing.images.length > 0
      ? typeof booking.bnb_listing.images[0] === 'string'
        ? booking.bnb_listing.images[0]
        : booking.bnb_listing.images[0]?.image
      : null);
  const hotelImage = booking.hotel?.primary_image || null;
  const stayImage = bnbImage || hotelImage || FALLBACK_IMAGE;
  const stayLink = booking.bnb_listing
    ? `/bnb/${booking.bnb_listing.id}`
    : booking.hotel
      ? `/hotel/${booking.hotel.id}`
      : null;

  const nights = Number(booking.total_nights || 0);
  const nightlyPrice = Number(booking.nightly_price || 0);
  const totalAmount = Number(booking.total_amount || 0);
  const depositAmount = Number(booking.deposit_amount || 0);
  const hasMultipleRoomItems = Array.isArray(booking.items) && booking.items.length > 0;
  const roomSubtotal = hasMultipleRoomItems ? totalAmount : nightlyPrice * nights;
  const serviceAndFees = Math.max(totalAmount - roomSubtotal, 0);

  const isHostApproved = booking.host_approval_status === 'approved';
  const isHostPending = booking.status === 'pending' && booking.host_approval_status === 'pending';
  const isHostDeclined = booking.status === 'cancelled' && booking.host_approval_status === 'declined';
  const isCancelled = booking.status === 'cancelled' && !isHostDeclined;
  const isConfirmed = booking.status === 'confirmed';
  const isCompleted = booking.status === 'completed';
  const needsPaymentChoice = booking.status === 'pending' && isHostApproved;
  const canPayOnline =
    isHostApproved &&
    selectedPaymentChoice === 'online' &&
    ['pending_payment', 'unpaid'].includes(booking.payment_status) &&
    booking.status === 'pending';
  const canCompleteReservation =
    isHostApproved && selectedPaymentChoice === 'pay_at_premises' && booking.status === 'pending';
  const canCancel = booking.status === 'pending';
  const isOnlineChoice = selectedPaymentChoice === 'online';
  const showStickyCta = canPayOnline || canCompleteReservation || canCancel;
  const dateLine = `${formatShortDate(booking.check_in)} – ${formatShortDate(booking.check_out)}${
    nights ? ` · ${nights} night${nights === 1 ? '' : 's'}` : ''
  }`;

  const hero = (() => {
    if (isHostDeclined) {
      return {
        tone: 'rose',
        title: "This place isn't available for your selected dates",
        body: "The host confirmed there's no vacancy for these dates. No payment was taken.",
      };
    }
    if (isCancelled) {
      return {
        tone: 'rose',
        title: 'This booking is cancelled',
        body: 'This reservation is no longer active.',
      };
    }
    if (isHostPending) {
      return {
        tone: 'amber',
        title: 'Waiting for host confirmation',
        body: "We've sent your request to the host. You'll be notified when they respond — no payment yet.",
      };
    }
    if (needsPaymentChoice) {
      return {
        tone: 'red',
        title: 'Confirm your stay',
        body: 'The host approved your dates. Choose how to pay to finish booking.',
      };
    }
    if (isConfirmed) {
      return {
        tone: 'green',
        title: `You're going to ${stayTitle}`,
        body: 'Your stay is confirmed. Details below for check-in day.',
      };
    }
    if (isCompleted) {
      return {
        tone: 'green',
        title: 'Stay completed',
        body: canWriteReview ? 'How was your trip? Share a quick review.' : 'Thanks for staying with Msafiri.',
      };
    }
    return {
      tone: 'neutral',
      title: stayTitle,
      body: dateLine,
    };
  })();

  const toneClasses = {
    amber: 'border-amber-200 bg-amber-50 text-amber-950',
    red: 'border-red-200 bg-red-50 text-red-950',
    green: 'border-green-200 bg-green-50 text-green-950',
    rose: 'border-rose-200 bg-rose-50 text-rose-950',
    neutral: 'border-gray-200 bg-white text-gray-900',
  };

  const thinProgress = (() => {
    if (isCancelled || isHostDeclined || isCompleted) return null;
    const steps = [
      { id: 'request', label: 'Requested', done: true },
      { id: 'host', label: 'Host', done: isHostApproved, current: isHostPending },
      {
        id: 'pay',
        label: 'Payment',
        done: ['paid', 'partially_paid'].includes(booking.payment_status) || isConfirmed,
        current: needsPaymentChoice,
      },
      { id: 'stay', label: 'Confirmed', done: isConfirmed || isCompleted, current: isConfirmed },
    ];
    return steps;
  })();

  return (
    <div className={`min-h-screen bg-gray-50 pt-14 lg:pt-20 ${showStickyCta ? 'pb-24 lg:pb-10' : 'pb-10'}`}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Phase 1 shell */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <button
            type="button"
            onClick={() => navigate('/dashboard', { state: { initialTab: 'bookings' } })}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-800 hover:text-red-600"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Trips
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="p-2 border border-gray-300 text-gray-700 hover:bg-gray-50"
              aria-label="More actions"
              aria-expanded={menuOpen}
            >
              <EllipsisHorizontalIcon className="w-5 h-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 shadow-sm z-20 py-1">
                <button
                  type="button"
                  onClick={handleCopyBookingRef}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
                >
                  <ClipboardDocumentIcon className="w-4 h-4" />
                  {copiedRef ? 'Copied!' : 'Copy booking ref'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCalendar}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Add to calendar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/dashboard', { state: { initialTab: 'bookings' } });
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  View All My Bookings
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Phase 2 state hero */}
        <section className={`border px-5 py-5 mb-6 ${toneClasses[hero.tone]}`}>
          <div className="flex items-start gap-3">
            {hero.tone === 'amber' && <ClockIcon className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />}
            {(hero.tone === 'green' || successState) && (
              <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            )}
            {(hero.tone === 'rose') && <XCircleIcon className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />}
            {hero.tone === 'red' && <ShieldCheckIcon className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />}
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{hero.title}</h1>
              <p className="mt-1 text-sm opacity-90">
                {stayTitle}
                {stayPlace ? ` · ${stayPlace}` : ''} · {dateLine}
              </p>
              <p className="mt-2 text-sm opacity-90">{hero.body}</p>

              {successState && (
                <div className="mt-3 text-sm font-medium">
                  <p>{successState.title}</p>
                  <p className="font-normal opacity-90 mt-0.5">{successState.message}</p>
                </div>
              )}

              {isHostDeclined && (
                <button
                  type="button"
                  onClick={() => navigate(booking.hotel ? '/hotels' : '/bnbs')}
                  className="mt-4 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700"
                >
                  Continue Searching
                </button>
              )}
            </div>
          </div>

          {thinProgress && (
            <ol className="mt-5 flex items-center gap-1" aria-label="Booking progress">
              {thinProgress.map((step) => (
                <li key={step.id} className="flex-1 min-w-0" title={step.label}>
                  <span
                    className={`block h-1 w-full ${
                      step.done ? 'bg-red-600' : step.current ? 'bg-amber-400' : 'bg-gray-200'
                    }`}
                  />
                  <span className="sr-only">
                    {step.label}
                    {step.done ? ' done' : step.current ? ' current' : ' upcoming'}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
          {/* Phase 3 trip facts */}
          <div className="lg:col-span-3 space-y-6">
            <section className="bg-white border border-gray-200 overflow-hidden">
              {stayLink ? (
                <Link to={stayLink} className="block group">
                  <div className="aspect-[16/9] bg-gray-100">
                    <img
                      src={stayImage}
                      alt=""
                      className="w-full h-full object-cover group-hover:opacity-95 transition-opacity"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = FALLBACK_IMAGE;
                      }}
                    />
                  </div>
                  <div className="p-5">
                    <h2 className="text-lg font-semibold text-gray-900 group-hover:underline">{stayTitle}</h2>
                    {stayPlace && (
                      <p className="mt-1 text-sm text-gray-500 inline-flex items-center gap-1">
                        <MapPinIcon className="w-4 h-4" />
                        {stayPlace}
                      </p>
                    )}
                    {(isConfirmed || isCompleted) && stayAddress && (
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">{stayAddress}</p>
                    )}
                  </div>
                </Link>
              ) : (
                <div>
                  <div className="aspect-[16/9] bg-gray-100">
                    <img src={stayImage} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-5">
                    <h2 className="text-lg font-semibold text-gray-900">{stayTitle}</h2>
                    {stayPlace && <p className="mt-1 text-sm text-gray-500">{stayPlace}</p>}
                  </div>
                </div>
              )}
            </section>

            <section className="bg-white border border-gray-200 p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Your trip</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Check-in</p>
                  <p className="mt-0.5 font-medium text-gray-900">{formatDate(booking.check_in)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Check-out</p>
                  <p className="mt-0.5 font-medium text-gray-900">{formatDate(booking.check_out)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Guests</p>
                  <p className="mt-0.5 font-medium text-gray-900">
                    {booking.num_adults} adult{booking.num_adults !== 1 ? 's' : ''}
                    {booking.num_children
                      ? `, ${booking.num_children} child${booking.num_children !== 1 ? 'ren' : ''}`
                      : ''}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Total</p>
                  <p className="mt-0.5 font-semibold text-gray-900">
                    {formatMoney(booking.currency, totalAmount)}
                  </p>
                </div>
              </div>

              {booking.special_requests && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-gray-500 text-sm">Special requests</p>
                  <p className="mt-1 text-sm text-gray-800">{booking.special_requests}</p>
                </div>
              )}
            </section>

            {/* Phase 4 quiet price disclosure */}
            <section className="bg-white border border-gray-200">
              <button
                type="button"
                onClick={() => setPriceOpen((open) => !open)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
                aria-expanded={priceOpen}
              >
                <span className="text-base font-semibold text-gray-900">Price details</span>
                <ChevronDownIcon
                  className={`w-5 h-5 text-gray-500 transition-transform ${priceOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {priceOpen && (
                <div className="px-5 pb-5 space-y-2 text-sm border-t border-gray-100 pt-4">
                  {hasMultipleRoomItems ? (
                    booking.items.map((item) => (
                      <div className="flex justify-between gap-3" key={item.id}>
                        <span className="text-gray-600">
                          {item.quantity}× {item.room_type_name} (
                          {formatMoney(booking.currency, item.nightly_price)} × {nights} night
                          {nights === 1 ? '' : 's'})
                        </span>
                        <span className="text-gray-900 whitespace-nowrap">
                          {formatMoney(booking.currency, item.subtotal)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-600">
                        {formatMoney(booking.currency, booking.nightly_price)} × {nights} night
                        {nights === 1 ? '' : 's'}
                      </span>
                      <span className="text-gray-900">{formatMoney(booking.currency, roomSubtotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-600">Service and fees</span>
                    <span className="text-gray-900">{formatMoney(booking.currency, serviceAndFees)}</span>
                  </div>
                  {depositAmount > 0 && (
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-600">Deposit</span>
                      <span className="text-gray-900">{formatMoney(booking.currency, depositAmount)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between font-semibold text-gray-900">
                    <span>Total</span>
                    <span>{formatMoney(booking.currency, totalAmount)}</span>
                  </div>
                </div>
              )}
            </section>

            {(booking.hotel || booking.bnb_listing) && (booking.review || canWriteReview) && (
              <section className="bg-white border border-gray-200 p-5">
                <h2 className="text-base font-semibold text-gray-900 mb-3">
                  {booking.review ? 'Your review' : 'Share your experience'}
                </h2>
                {booking.review ? (
                  <div>
                    <div className="flex items-center gap-0.5 mb-1">
                      {[1, 2, 3, 4, 5].map((n) =>
                        n <= booking.review.rating ? (
                          <StarIconSolid key={n} className="w-5 h-5 text-yellow-400" />
                        ) : (
                          <StarIconOutline key={n} className="w-5 h-5 text-gray-300" />
                        )
                      )}
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
                      className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-red-600"
                    />
                    <textarea
                      placeholder="Tell other travelers about your stay..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-red-600"
                    />
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowReviewForm(false)}
                        className="px-4 py-2 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmitReview}
                        disabled={reviewRating < 1 || isSubmittingReview}
                        className="px-4 py-2 text-sm bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60"
                      >
                        {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(true)}
                    className="px-4 py-2 text-sm bg-red-600 text-white font-semibold hover:bg-red-700"
                  >
                    Write a Review
                  </button>
                )}
              </section>
            )}

            {(booking.hotel || booking.bnb_listing) && reviewStats && (
              <section className="bg-white border border-gray-200 p-5">
                <h2 className="text-base font-semibold text-gray-900 mb-2">Recent feedback</h2>
                <p className="text-sm text-gray-600 mb-3">
                  Average{' '}
                  <span className="font-semibold text-gray-900">{reviewStats.average_rating || '—'}</span> ·{' '}
                  {reviewStats.total_reviews || 0} reviews
                </p>
                {reviews.length > 0 ? (
                  <div className="space-y-3">
                    {reviews.slice(0, 2).map((review) => (
                      <div key={review.id} className="border-t border-gray-100 pt-3 first:border-0 first:pt-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {review.traveler_name || 'Anonymous'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(review.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-700 mt-1">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No recent reviews available.</p>
                )}
              </section>
            )}

            <MessageThread bookingId={booking.id} />
          </div>

          {/* Actions column */}
          <div className="lg:col-span-2 space-y-4">
            {needsPaymentChoice && (
              <section className="bg-white border border-gray-200 p-5">
                <h3 className="text-lg font-semibold text-gray-900">Payment Choice</h3>
                <p className="mt-1 text-sm text-gray-500">
                  The host confirmed this is available. Choose how you want to pay.
                </p>

                <div className="mt-4 space-y-3">
                  <label
                    className={`flex gap-3 border p-4 cursor-pointer ${
                      isOnlineChoice ? 'border-red-600 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="booking-payment-choice"
                      value="online"
                      checked={isOnlineChoice}
                      onChange={(e) => handlePaymentChoiceChange(e.target.value)}
                      disabled={isSavingPaymentChoice}
                      className="mt-1 h-4 w-4 accent-red-600"
                    />
                    <span className="flex-1">
                      <span className="block font-semibold text-gray-900">Pay now</span>
                      <span className="mt-0.5 block text-sm text-gray-600">
                        Pay online and confirm once payment goes through.
                      </span>
                    </span>
                  </label>

                  <label
                    className={`flex gap-3 border p-4 cursor-pointer ${
                      !isOnlineChoice ? 'border-red-600 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="booking-payment-choice"
                      value="pay_at_premises"
                      checked={!isOnlineChoice}
                      onChange={(e) => handlePaymentChoiceChange(e.target.value)}
                      disabled={isSavingPaymentChoice}
                      className="mt-1 h-4 w-4 accent-red-600"
                    />
                    <span className="flex-1">
                      <span className="block font-semibold text-gray-900">Pay at the property</span>
                      <span className="mt-0.5 block text-sm text-gray-600">
                        Confirm now; pay in cash or card at check-in.
                      </span>
                    </span>
                  </label>
                </div>

                {isSavingPaymentChoice && (
                  <p className="mt-3 text-sm text-gray-500">Saving your payment choice…</p>
                )}

                <div className="mt-4 space-y-2">
                  {canPayOnline && (
                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(true)}
                      className="w-full bg-red-600 text-white py-3 px-4 font-semibold hover:bg-red-700"
                    >
                      Pay {formatMoney(booking.currency, totalAmount)}
                    </button>
                  )}
                  {canCompleteReservation && (
                    <button
                      type="button"
                      onClick={handleCompleteReservation}
                      disabled={isCompletingReservation || isSavingPaymentChoice}
                      className="w-full bg-red-600 text-white py-3 px-4 font-semibold hover:bg-red-700 disabled:opacity-60"
                    >
                      {isCompletingReservation ? 'Completing...' : 'Complete Reservation'}
                    </button>
                  )}
                </div>
              </section>
            )}

            {!needsPaymentChoice && canPayOnline && (
              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                className="w-full bg-red-600 text-white py-3 px-4 font-semibold hover:bg-red-700"
              >
                Pay {formatMoney(booking.currency, totalAmount)}
              </button>
            )}

            {canCancel && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="w-full border border-gray-300 text-gray-800 py-2.5 px-4 font-medium hover:bg-gray-50"
              >
                Cancel request
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate('/dashboard', { state: { initialTab: 'bookings' } })}
              className="w-full border border-gray-300 text-gray-700 py-2.5 px-4 font-medium hover:bg-gray-50"
            >
              View All My Bookings
            </button>

            {(isConfirmed || isCompleted) && (
              <button
                type="button"
                onClick={handleDownloadCalendar}
                className="w-full border border-gray-300 text-gray-700 py-2.5 px-4 font-medium hover:bg-gray-50"
              >
                Add to calendar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Phase 4 sticky mobile CTA */}
      {(canPayOnline || canCompleteReservation) && (
        <div className="lg:hidden fixed bottom-16 inset-x-0 z-30 border-t border-gray-200 bg-white p-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-lg font-bold text-gray-900">{formatMoney(booking.currency, totalAmount)}</p>
            </div>
            {canPayOnline ? (
              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                className="px-4 py-2.5 bg-red-600 text-white font-semibold hover:bg-red-700"
              >
                Pay now
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCompleteReservation}
                disabled={isCompletingReservation}
                className="px-4 py-2.5 bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60"
              >
                {isCompletingReservation ? 'Completing...' : 'Confirm'}
              </button>
            )}
          </div>
        </div>
      )}

      {showCancelModal && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white p-6 shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Cancel request?</h3>
            <p className="text-sm text-gray-600 mb-6">
              This will cancel your reservation request. If payment was made, refund handling follows your
              booking policy.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
                className="flex-1 border border-gray-300 px-4 py-2.5 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-60"
              >
                Keep trip
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={isCancelling}
                className="flex-1 bg-rose-600 px-4 py-2.5 text-white font-semibold hover:bg-rose-700 disabled:opacity-60"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm cancel'}
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
