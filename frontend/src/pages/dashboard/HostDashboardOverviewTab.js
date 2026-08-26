import React from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  StarIcon,
  PlusIcon,
  BellIcon,
  UsersIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import HostBookingActionButtons from './HostBookingActionButtons';

const HostDashboardOverviewTab = ({
  error,
  success,
  setError,
  setSuccess,
  sectionLoading,
  setSummaryRange,
  summaryRange,
  summaryCustomFrom,
  setSummaryCustomFrom,
  summaryCustomTo,
  setSummaryCustomTo,
  stats,
  reviews,
  formatCurrency,
  alertCards,
  approvalAlertCount,
  onReviewApprovalRequests,
  setShowAddHotelModal,
  setActiveTab,
  bookingsLastUpdatedAt,
  setBookingStatusFilter,
  bookingStatusFilter,
  bookingStatusCounts,
  filteredBookings,
  timeAgo,
  getStatusColor,
  bookingActionLoadingId,
  setSelectedBooking,
  handleBookingStatusUpdate,
}) => (
  <div className="space-y-6">
    {approvalAlertCount > 0 && (
      <div className="rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 via-white to-amber-50 p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-rose-100 p-2.5">
              <BellIcon className="h-6 w-6 text-rose-600" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-rose-700">Needs Attention</p>
              <h3 className="mt-1 text-xl font-bold text-gray-900">
                {approvalAlertCount} hotel booking request{approvalAlertCount > 1 ? 's' : ''} waiting for approval
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Guests are waiting for you to approve or decline their reservation requests.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onReviewApprovalRequests}
            className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
          >
            Review Approval Requests
          </button>
        </div>
      </div>
    )}

    {error && (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => setError('')}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    )}

    {success && (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex">
          <CheckIcon className="h-5 w-5 text-green-400 mr-2" />
          <p className="text-sm text-green-700">{success}</p>
          <button
            onClick={() => setSuccess('')}
            className="ml-auto text-green-400 hover:text-green-600"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    )}

    {sectionLoading.overview && (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-40 bg-gray-200 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )}

    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Summary Range</h3>
          <p className="text-xs text-gray-500">Metrics update based on selected period</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['7d', '30d', '90d', 'custom'].map((rangeOption) => (
            <button
              key={rangeOption}
              type="button"
              onClick={() => setSummaryRange(rangeOption)}
              className={`px-3 py-1.5 text-sm rounded-full border ${
                summaryRange === rangeOption
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {rangeOption === 'custom' ? 'Custom' : rangeOption.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      {summaryRange === 'custom' && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
            <input
              type="date"
              value={summaryCustomFrom}
              onChange={(event) => setSummaryCustomFrom(event.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
            <input
              type="date"
              value={summaryCustomTo}
              onChange={(event) => setSummaryCustomTo(event.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Bookings</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalBookings}</p>
          </div>
          <CalendarIcon className="h-8 w-8 text-blue-600" />
        </div>
        <div className="mt-2 flex items-center text-sm text-gray-500"><span>All time bookings</span></div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.monthlyRevenue)}</p>
          </div>
          <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
        </div>
        <div className="mt-2 flex items-center text-sm text-gray-500"><span>This month</span></div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Average Rating</p>
            <p className="text-2xl font-bold text-gray-900">{stats.averageRating || 'N/A'}</p>
          </div>
          <StarIcon className="h-8 w-8 text-yellow-600" />
        </div>
        <div className="mt-2 flex items-center text-sm text-gray-500"><span>From {reviews.length} reviews</span></div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Occupancy Rate</p>
            <p className="text-2xl font-bold text-gray-900">{stats.occupancyRate}%</p>
          </div>
          <UsersIcon className="h-8 w-8 text-purple-600" />
        </div>
        <div className="mt-2 flex items-center text-sm text-gray-500">
          <span>{Math.max((stats.totalRooms || 0) - (stats.availableRooms || 0), 0)} of {stats.totalRooms} rooms</span>
        </div>
      </motion.div>
    </div>

    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Action Center</h3>
        <span className="text-xs text-gray-500">Host alerts</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {alertCards.map((alert) => (
          <div key={alert.id} className={`border rounded-lg p-4 ${alert.className}`}>
            <p className="text-sm font-medium">{alert.label}</p>
            <p className="mt-1 text-2xl font-bold">{alert.value}</p>
            <button
              type="button"
              data-testid={`alert-action-${alert.id}`}
              onClick={alert.onAction}
              className="mt-3 text-xs font-semibold underline underline-offset-2"
            >
              {alert.actionLabel}
            </button>
          </div>
        ))}
      </div>
    </div>

    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button onClick={() => setShowAddHotelModal(true)} className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
          <PlusIcon className="h-6 w-6 text-gray-400 mr-2" />
          <span className="text-gray-600">Add New Hotel</span>
        </button>
        <button onClick={() => setActiveTab('bookings')} className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors">
          <CalendarIcon className="h-6 w-6 text-gray-400 mr-2" />
          <span className="text-gray-600">Manage Bookings</span>
        </button>
        <button onClick={() => setActiveTab('analytics')} className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors">
          <ChartBarIcon className="h-6 w-6 text-gray-400 mr-2" />
          <span className="text-gray-600">View Analytics</span>
        </button>
      </div>
    </motion.div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Bookings</h3>
        {bookingsLastUpdatedAt && (
          <p className="text-xs text-gray-500 mb-3">
            Last updated: {bookingsLastUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
        <div className="mb-3 flex flex-wrap gap-2">
          {[
            ['all', 'All'],
            ['pending', 'Pending'],
            ['awaiting_approval', 'Awaiting Approval'],
            ['awaiting_payment', 'Awaiting Payment'],
            ['confirmed', 'Confirmed'],
            ['cancelled', 'Cancelled'],
            ['completed', 'Completed'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setBookingStatusFilter(value)}
              className={`px-2.5 py-1 text-xs rounded-full border ${
                bookingStatusFilter === value
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {label} ({bookingStatusCounts[value] || 0})
            </button>
          ))}
        </div>
        <div className="space-y-2.5">
          {sectionLoading.bookings && (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-100 rounded-xl" />
              ))}
            </div>
          )}
          {!sectionLoading.bookings && filteredBookings.slice(0, 5).map((booking) => (
            <div key={booking.id} className="p-3 border border-gray-200 rounded-xl bg-white">
              <div className="flex items-start justify-between gap-3 pb-2 border-b border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{booking.guest_name || 'Guest'}</p>
                  <p className="text-xs text-gray-600">{booking.hotel_name || 'Hotel'}</p>
                  <p className="text-xs text-gray-500">{booking.room_name || '—'}</p>
                  {booking.updated_at ? (
                    <p className="text-xs text-gray-500">Updated {timeAgo(booking.updated_at)}</p>
                  ) : null}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(booking.total_amount || 0)}</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <span className="text-gray-500">Check-in</span>
                <span className="text-gray-900 text-right">{booking.check_in || booking.checkIn || '—'}</span>
                <span className="text-gray-500">Check-out</span>
                <span className="text-gray-900 text-right">{booking.check_out || booking.checkOut || '—'}</span>
              </div>
              <div className="mt-2.5">
                <div className="mb-2 flex flex-wrap gap-2 text-[11px]">
                  <span className={`inline-flex px-2 py-1 rounded-full font-medium ${booking.needsApproval ? 'bg-blue-100 text-blue-700' : booking.needsPayment ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}`}>
                    {booking.requestStage}
                  </span>
                  <span className="inline-flex px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                    {booking.payment_method === 'online' ? 'Pay Now' : 'Pay at Hotel'}
                  </span>
                </div>
                <HostBookingActionButtons
                  booking={booking}
                  bookingActionLoadingId={bookingActionLoadingId}
                  onView={setSelectedBooking}
                  onStatusChange={handleBookingStatusUpdate}
                />
              </div>
            </div>
          ))}
          {!sectionLoading.bookings && filteredBookings.length === 0 && (
            <p className="text-gray-500 text-center py-4 border border-dashed border-gray-200 rounded-xl">No bookings yet</p>
          )}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Schedule</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <p className="font-medium text-gray-900">Check-ins</p>
                <p className="text-sm text-gray-600">{stats.todayCheckIns} guests</p>
              </div>
            </div>
            <ClockIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
              <div>
                <p className="font-medium text-gray-900">Check-outs</p>
                <p className="text-sm text-gray-600">{stats.todayCheckOuts} guests</p>
              </div>
            </div>
            <ClockIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
              <div>
                <p className="font-medium text-gray-900">Pending Bookings</p>
                <p className="text-sm text-gray-600">{stats.pendingBookings} requests</p>
              </div>
            </div>
            <BellIcon className="h-5 w-5 text-gray-400" />
          </div>
        </div>
      </motion.div>
    </div>
  </div>
);

export default HostDashboardOverviewTab;
