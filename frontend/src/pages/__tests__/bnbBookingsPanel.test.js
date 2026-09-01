import React from 'react';
import BnBBookingsPanel from '../dashboard/BnBBookingsPanel';
import { bookingsAPI } from '../../services/api';
import { createDomTestHarness } from '../../test/testHarness';

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
  bookingsAPI: {
    getHostBookings: jest.fn(),
    updateHostBookingStatus: jest.fn(),
  },
}));

const baseBooking = {
  id: 200,
  status: 'pending',
  host_approval_status: 'pending',
  payment_method: 'pay_at_premises',
  payment_status: 'unpaid',
  check_in: '2026-05-10',
  check_out: '2026-05-12',
  total_amount: '6000.00',
  created_at: '2026-05-01T10:00:00Z',
  updated_at: '2026-05-01T10:00:00Z',
  traveler_name: 'Alice Guest',
  guest_full_name: 'Alice Guest',
  traveler_email: 'alice@example.com',
  guest_email: 'alice@example.com',
  guest_phone: '+254700000001',
  bnb_listing_title: 'Savannah Stay',
  booking_type: 'bnb',
};

describe('BnBBookingsPanel', () => {
  let harness;

  beforeEach(() => {
    jest.clearAllMocks();
    harness = createDomTestHarness();
  });

  afterEach(async () => {
    await harness.unmount();
  });

  it('loads host bookings and shows an approve-request alert for pending ones', async () => {
    bookingsAPI.getHostBookings.mockResolvedValue({ results: [baseBooking] });

    harness.render(<BnBBookingsPanel />);

    await harness.waitForCondition(() =>
      harness.container.textContent.includes('reservation request')
    );
    expect(harness.container.textContent).toContain('waiting for your confirmation');
    expect(harness.container.textContent).toContain('Savannah Stay');
  });

  it('approving a pending booking calls the API and keeps status pending while flipping request stage', async () => {
    bookingsAPI.getHostBookings.mockResolvedValue({ results: [baseBooking] });
    bookingsAPI.updateHostBookingStatus.mockResolvedValue({
      ...baseBooking,
      status: 'pending',
      host_approval_status: 'approved',
    });

    harness.render(<BnBBookingsPanel />);

    await harness.waitForCondition(() =>
      harness.container.querySelectorAll('[data-testid="booking-row"]').length === 1
    );

    const approveButton = Array.from(harness.container.querySelectorAll('button')).find(
      (btn) => btn.textContent.trim() === 'Approve Booking'
    );
    expect(approveButton).toBeTruthy();
    harness.click(approveButton);

    await harness.waitForCondition(() =>
      bookingsAPI.updateHostBookingStatus.mock.calls.length > 0
    );
    expect(bookingsAPI.updateHostBookingStatus).toHaveBeenCalledWith(200, 'confirmed');

    await harness.waitForCondition(() => {
      const btn = Array.from(harness.container.querySelectorAll('button')).find(
        (b) => b.textContent.trim() === 'Approved'
      );
      return Boolean(btn);
    });

    // handleStatusChange's finally-block setBookingActionLoadingId(null) lands
    // in a microtask after the button text has already updated, so flush it
    // inside act() before the test ends to avoid a stray warning.
    await harness.settle();
  });

  it('declining a pending booking calls the API with cancelled', async () => {
    bookingsAPI.getHostBookings.mockResolvedValue({ results: [baseBooking] });
    bookingsAPI.updateHostBookingStatus.mockResolvedValue({
      ...baseBooking,
      status: 'cancelled',
      host_approval_status: 'declined',
    });

    harness.render(<BnBBookingsPanel />);

    await harness.waitForCondition(() =>
      harness.container.querySelectorAll('[data-testid="booking-row"]').length === 1
    );

    const declineButton = Array.from(harness.container.querySelectorAll('button')).find(
      (btn) => btn.textContent.trim() === 'Decline Booking'
    );
    harness.click(declineButton);

    await harness.waitForCondition(() =>
      bookingsAPI.updateHostBookingStatus.mock.calls.length > 0
    );
    expect(bookingsAPI.updateHostBookingStatus).toHaveBeenCalledWith(200, 'cancelled');
    await harness.settle();
  });
});
