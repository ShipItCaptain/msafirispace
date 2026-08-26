import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import HotelHostDashboard from '../HotelHostDashboardPlaceholder';
import { useAuth } from '../../hooks/useAuth';
import { authAPI, bookingsAPI, listingsAPI, reviewsAPI } from '../../services/api';
import { createDomTestHarness } from '../../test/testHarness';

jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('framer-motion', () => {
  const ReactLocal = require('react');
  const MockMotion = ReactLocal.forwardRef(({ children, ...rest }, ref) => (
    <div ref={ref} {...rest}>{children}</div>
  ));
  return {
    motion: new Proxy({}, { get: () => MockMotion }),
    AnimatePresence: ({ children }) => <>{children}</>,
  };
});

jest.mock('../../services/api', () => ({
  authAPI: {
    getHostDashboardSummary: jest.fn(),
    getUserDetail: jest.fn(),
  },
  listingsAPI: {
    getUserListings: jest.fn(),
  },
  bookingsAPI: {
    getHostBookings: jest.fn(),
    updateHostBookingStatus: jest.fn(),
  },
  reviewsAPI: {
    getHotelReviews: jest.fn(),
  },
}));

const mockUseAuth = useAuth;
const routerFutureFlags = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

const setupMocks = () => {
  mockUseAuth.mockReturnValue({
    user: { id: 9, email: 'host@example.com', first_name: 'Host' },
  });

  listingsAPI.getUserListings.mockResolvedValue({
    results: [
      {
        id: 1,
        name: 'Host Hotel',
        host: 9,
        city: 'Wote',
        country: 'Kenya',
        room_types: [{ id: 201 }],
      },
    ],
  });

  bookingsAPI.getHostBookings.mockResolvedValue({
    results: [
      {
        id: 100,
        status: 'pending',
        payment_method: 'pay_at_premises',
        payment_status: 'unpaid',
        check_in: '2026-03-10',
        check_out: '2026-03-12',
        total_amount: '4000.00',
        created_at: '2026-03-01T10:00:00Z',
        updated_at: '2026-03-01T10:00:00Z',
        traveler_name: 'Alice',
        guest_full_name: 'Alice',
        traveler_email: 'alice@example.com',
        guest_email: 'alice@example.com',
        guest_phone: '+254700000001',
        hotel_name: 'Host Hotel',
        room_name: 'Standard',
        booking_type: 'hotel',
      },
      {
        id: 101,
        status: 'pending',
        payment_method: 'online',
        payment_status: 'pending_payment',
        check_in: '2026-03-13',
        check_out: '2026-03-14',
        total_amount: '5000.00',
        created_at: '2026-03-02T10:00:00Z',
        updated_at: '2026-03-02T10:00:00Z',
        traveler_name: 'Bob',
        guest_full_name: 'Bob',
        traveler_email: 'bob@example.com',
        guest_email: 'bob@example.com',
        guest_phone: '+254700000002',
        hotel_name: 'Host Hotel',
        room_name: 'Deluxe',
        booking_type: 'hotel',
      },
    ],
  });

  authAPI.getHostDashboardSummary.mockResolvedValue({
    total_bookings: 2,
    total_revenue: 9000,
    average_rating: 4.5,
    occupancy_rate: 50,
    total_rooms: 2,
    available_rooms: 1,
    pending_bookings: 2,
    today_check_ins: 0,
    today_check_outs: 0,
  });
  authAPI.getUserDetail.mockResolvedValue({
    company_name: 'Host Ventures',
    email: 'host@example.com',
    phone_number: '+254700000000',
    preferred_language: 'en',
    preferred_currency: 'KES',
    notification_preferences: {
      new_booking_notifications: true,
      review_notifications: true,
      marketing_emails: false,
    },
  });

  reviewsAPI.getHotelReviews.mockResolvedValue([]);
};

describe('Host dashboard interactions', () => {
  let harness;

  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
    harness = createDomTestHarness();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    console.log.mockRestore();
    await harness.unmount();
  });

  it('filters bookings table by pending status chip', async () => {
    harness.render(
      <MemoryRouter future={routerFutureFlags}>
        <HotelHostDashboard />
      </MemoryRouter>
    );

    await harness.waitForCondition(() => harness.container.querySelector('[data-testid="alert-action-awaiting-approval"]'));
    const bookingsTab = Array.from(harness.container.querySelectorAll('button')).find((btn) => btn.textContent.trim() === 'Bookings');
    harness.click(bookingsTab);

    await harness.waitForCondition(() => harness.container.querySelectorAll('[data-testid="booking-row"]').length >= 2);

    const pendingChip = harness.container.querySelector('[data-testid="booking-filter-pending"]');
    harness.click(pendingChip);

    await harness.waitForCondition(() => harness.container.querySelectorAll('[data-testid="booking-row"]').length === 2);
    expect(harness.container.textContent.includes('Alice')).toBe(true);
    expect(harness.container.textContent.includes('Bob')).toBe(true);
  });

  it('filters bookings table by awaiting approval and awaiting payment chips', async () => {
    harness.render(
      <MemoryRouter future={routerFutureFlags}>
        <HotelHostDashboard />
      </MemoryRouter>
    );

    await harness.waitForCondition(() => harness.container.querySelector('[data-testid="alert-action-awaiting-approval"]'));
    const bookingsTab = Array.from(harness.container.querySelectorAll('button')).find((btn) => btn.textContent.trim() === 'Bookings');
    harness.click(bookingsTab);

    await harness.waitForCondition(() => harness.container.querySelectorAll('[data-testid="booking-row"]').length >= 2);

    const approvalChip = harness.container.querySelector('[data-testid="booking-filter-awaiting_approval"]');
    harness.click(approvalChip);
    await harness.waitForCondition(() => harness.container.querySelectorAll('[data-testid="booking-row"]').length === 1);
    expect(harness.container.textContent.includes('Alice')).toBe(true);
    expect(harness.container.textContent.includes('Bob')).toBe(false);

    const paymentChip = harness.container.querySelector('[data-testid="booking-filter-awaiting_payment"]');
    harness.click(paymentChip);
    await harness.waitForCondition(() => harness.container.querySelectorAll('[data-testid="booking-row"]').length === 1);
    expect(harness.container.textContent.includes('Alice')).toBe(false);
    expect(harness.container.textContent.includes('Bob')).toBe(true);
  });

  it('keeps booking detail modal open and updates status inline', async () => {
    bookingsAPI.updateHostBookingStatus.mockResolvedValue({
      id: 100,
      status: 'confirmed',
      payment_method: 'pay_at_premises',
      payment_status: 'unpaid',
      check_in: '2026-03-10',
      check_out: '2026-03-12',
      total_amount: '4000.00',
      created_at: '2026-03-01T10:00:00Z',
      updated_at: '2026-03-03T10:00:00Z',
      traveler_name: 'Alice',
      guest_full_name: 'Alice',
      traveler_email: 'alice@example.com',
      guest_email: 'alice@example.com',
      guest_phone: '+254700000001',
      hotel_name: 'Host Hotel',
      room_name: 'Standard',
      booking_type: 'hotel',
    });

    harness.render(
      <MemoryRouter future={routerFutureFlags}>
        <HotelHostDashboard />
      </MemoryRouter>
    );

    await harness.waitForCondition(() => harness.container.querySelector('[data-testid="alert-action-awaiting-approval"]'));
    const bookingsTab = Array.from(harness.container.querySelectorAll('button')).find((btn) => btn.textContent.trim() === 'Bookings');
    harness.click(bookingsTab);

    await harness.waitForCondition(() => harness.container.querySelectorAll('[data-testid="booking-row"]').length >= 2);
    const approvalChip = harness.container.querySelector('[data-testid="booking-filter-awaiting_approval"]');
    harness.click(approvalChip);
    await harness.waitForCondition(() => harness.container.querySelectorAll('[data-testid="booking-row"]').length === 1);

    const viewButtons = Array.from(harness.container.querySelectorAll('button')).filter((btn) => btn.textContent.trim() === 'View');
    harness.click(viewButtons[0]);

    await harness.waitForCondition(() => harness.container.querySelector('[data-testid="booking-detail-modal"]'));
    expect(harness.container.querySelector('[data-testid="booking-detail-status"]').textContent).toContain('pending');

    const confirmButtons = Array.from(harness.container.querySelectorAll('button')).filter((btn) => btn.textContent.trim() === 'Approve Booking');
    harness.click(confirmButtons[confirmButtons.length - 1]);

    await harness.waitForCondition(() => harness.container.querySelector('[data-testid="booking-detail-status"]').textContent.includes('confirmed'));
    expect(harness.container.querySelector('[data-testid="booking-detail-modal"]')).toBeTruthy();
    expect(bookingsAPI.updateHostBookingStatus).toHaveBeenCalledWith(100, 'confirmed');
  });

  it('alert center pending action opens bookings with pending filter', async () => {
    harness.render(
      <MemoryRouter future={routerFutureFlags}>
        <HotelHostDashboard />
      </MemoryRouter>
    );

    await harness.waitForCondition(() => harness.container.querySelector('[data-testid="alert-action-awaiting-approval"]'));
    const reviewPending = harness.container.querySelector('[data-testid="alert-action-awaiting-approval"]');
    harness.click(reviewPending);

    await harness.waitForCondition(() => harness.container.textContent.includes('Bookings Management'));
    await harness.waitForCondition(() => harness.container.querySelectorAll('[data-testid="booking-row"]').length === 1);
    expect(harness.container.textContent.includes('Alice')).toBe(true);
    expect(harness.container.textContent.includes('Bob')).toBe(false);
  });
});
