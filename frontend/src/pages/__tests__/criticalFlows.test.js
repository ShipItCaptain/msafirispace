import React from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import BookingDetailPage from '../BookingDetailPage';
import DashboardPage from '../DashboardPage';
import BnBDetailPage from '../BnBDetailPage';
import { useAuth } from '../../hooks/useAuth';
import { FavoritesProvider } from '../../contexts/FavoritesContext';
import { createDomTestHarness, setInputValue } from '../../test/testHarness';
import {
  authAPI,
  bnbAPI,
  bookingsAPI,
  listingsAPI,
  reviewsAPI,
} from '../../services/api';

jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../components/auth/RoleIndicator', () => () => <div data-testid="role-indicator" />);
jest.mock('../../components/auth/RoleSwitcher', () => () => <div data-testid="role-switcher" />);
jest.mock('../../utils/analytics', () => ({
  trackEvent: jest.fn(),
}));

jest.mock('framer-motion', () => {
  const React = require('react');
  const MockMotion = React.forwardRef(
    ({ children, initial, animate, transition, exit, whileInView, viewport, ...rest }, ref) => (
      <div ref={ref} {...rest}>
        {children}
      </div>
    )
  );
  return {
    motion: new Proxy(
      {},
      {
        get: () => MockMotion,
      }
    ),
  };
});

jest.mock('../../services/api', () => ({
  authAPI: {
    getUserDashboard: jest.fn(),
  },
  bnbAPI: {
    getListing: jest.fn(),
  },
  bookingsAPI: {
    getBooking: jest.fn(),
    getBookings: jest.fn(),
    createBooking: jest.fn(),
    cancelBooking: jest.fn(),
  },
  listingsAPI: {
    getCombinedFavorites: jest.fn(),
    addFavorite: jest.fn(),
    removeFavorite: jest.fn(),
    addBnBFavorite: jest.fn(),
    removeBnBFavorite: jest.fn(),
  },
  reviewsAPI: {
    getHotelReviews: jest.fn(),
    getHotelReviewStats: jest.fn(),
    getBnBReviews: jest.fn(),
    getBnBReviewStats: jest.fn(),
  },
}));

const mockUseAuth = useAuth;

const DashboardStateProbe = () => {
  const location = useLocation();
  return <div id="dashboard-state">{location.state?.initialTab || 'none'}</div>;
};

const routerFutureFlags = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

describe('Critical booking flows', () => {
  let harness;
  let container;
  let waitForCondition;
  let click;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { first_name: 'Brian', active_role: 'guest', roles: ['guest'] },
      isAuthenticated: true,
      isBnBHost: false,
      isHotelRestaurantHost: false,
    });

    harness = createDomTestHarness();
    container = harness.container;
    waitForCondition = harness.waitForCondition;
    click = harness.click;
  });

  afterEach(async () => {
    await harness.unmount();
  });

  it('navigates from booking detail to dashboard bookings tab', async () => {
    bookingsAPI.getBooking.mockResolvedValue({
      id: 10,
      status: 'pending',
      payment_status: 'unpaid',
      payment_method: 'offline',
      check_in: '2026-03-10',
      check_out: '2026-03-12',
      total_nights: 2,
      num_adults: 1,
      num_children: 0,
      guest_full_name: 'Brian Mutunga',
      guest_email: 'brian@example.com',
      guest_phone: '+254700000000',
      currency: 'KES',
      nightly_price: 1000,
      total_amount: 2200,
      deposit_amount: 0,
      bnb_listing: {
        id: 11,
        title: 'Savannah Stay',
        city: 'Wote',
        country: 'Kenya',
        address: 'Wote, Makueni',
        description: 'Comfortable stay',
        primary_image: null,
        images: [],
      },
    });

    harness.render(
      <MemoryRouter initialEntries={['/booking/10']} future={routerFutureFlags}>
        <Routes>
          <Route path="/booking/:id" element={<BookingDetailPage />} />
          <Route path="/dashboard" element={<DashboardStateProbe />} />
        </Routes>
      </MemoryRouter>
    );

    await waitForCondition(() => container.textContent.includes('View All My Bookings'));
    const viewAllButton = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent.includes('View All My Bookings')
    );
    expect(viewAllButton).toBeTruthy();

    click(viewAllButton);

    await waitForCondition(() => container.textContent.includes('bookings'));
    const probe = container.querySelector('#dashboard-state');
    expect(probe && probe.textContent).toBe('bookings');
  });

  it('opens DashboardPage on bookings tab when initialTab state is provided', async () => {
    // Keep these pending in this test while still asserting tab routing behavior.
    authAPI.getUserDashboard.mockImplementation(() => new Promise(() => {}));
    bookingsAPI.getBookings.mockImplementation(() => new Promise(() => {}));
    listingsAPI.getCombinedFavorites.mockImplementation(() => new Promise(() => {}));

    harness.render(
      <MemoryRouter
        initialEntries={[{ pathname: '/dashboard', state: { initialTab: 'bookings' } }]}
        future={routerFutureFlags}
      >
        <FavoritesProvider>
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Routes>
        </FavoritesProvider>
      </MemoryRouter>
    );

    await waitForCondition(() => container.textContent.includes('My Bookings'));
    expect(container.textContent.includes('My Bookings')).toBe(true);
    expect(bookingsAPI.getBookings).toHaveBeenCalled();
  });

  it('shows booking card price breakdown total for a selected date range', async () => {
    bnbAPI.getListing.mockResolvedValue({
      id: 11,
      title: 'City Apartment',
      city: 'Wote',
      country: 'Kenya',
      address: 'Wote, Makueni',
      description: 'Modern apartment',
      price_per_night: 1000,
      cleaning_fee: 200,
      security_deposit: 0,
      max_guests: 4,
      minimum_nights: 1,
      maximum_nights: 30,
      check_in_time: '15:00:00',
      check_out_time: '11:00:00',
      amenities: [],
      house_rules: [],
      images: [],
      primary_image: null,
      smoking_allowed: false,
      pets_allowed: false,
      parties_allowed: false,
      children_allowed: true,
    });
    reviewsAPI.getBnBReviews.mockResolvedValue([]);
    reviewsAPI.getBnBReviewStats.mockResolvedValue({});
    listingsAPI.getCombinedFavorites.mockResolvedValue({ results: [] });

    harness.render(
      <MemoryRouter initialEntries={['/bnb/11']} future={routerFutureFlags}>
        <FavoritesProvider>
          <Routes>
            <Route path="/bnb/:id" element={<BnBDetailPage />} />
          </Routes>
        </FavoritesProvider>
      </MemoryRouter>
    );

    await waitForCondition(() => container.textContent.includes('Reserve This Stay'));
    const dateInputs = container.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBe(2);

    setInputValue(dateInputs[0], '2026-03-10');
    setInputValue(dateInputs[1], '2026-03-13');

    await waitForCondition(() => container.textContent.includes('KSh 1,000 x 3 night(s)'), 7000);
    expect(container.textContent.includes('KSh 3,440')).toBe(true);
  });
});
