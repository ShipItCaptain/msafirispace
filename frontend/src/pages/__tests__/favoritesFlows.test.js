import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DashboardPage from '../DashboardPage';
import HotelCard from '../../components/hotel/HotelCard';
import BnBCard from '../../components/bnb/BnBCard';
import { useAuth } from '../../hooks/useAuth';
import { authAPI, listingsAPI } from '../../services/api';
import { FavoritesProvider } from '../../contexts/FavoritesContext';
import { createDomTestHarness } from '../../test/testHarness';

jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../components/auth/RoleIndicator', () => () => <div data-testid="role-indicator" />);
jest.mock('../../components/auth/RoleSwitcher', () => () => <div data-testid="role-switcher" />);
jest.mock('../../utils/analytics', () => ({
  trackEvent: jest.fn(),
}));

const mockUseAuth = useAuth;
const routerFutureFlags = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

jest.mock('../../services/api', () => ({
  authAPI: {
    getUserDashboard: jest.fn(),
  },
  listingsAPI: {
    getCombinedFavorites: jest.fn(),
    addFavorite: jest.fn(),
    removeFavorite: jest.fn(),
    addBnBFavorite: jest.fn(),
    removeBnBFavorite: jest.fn(),
  },
  bookingsAPI: {
    getBookings: jest.fn(),
    cancelBooking: jest.fn(),
  },
}));

describe('Favorites flows', () => {
  let harness;
  let container;
  let settle;
  let waitForCondition;
  let click;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 7, first_name: 'Brian', active_role: 'guest', roles: ['guest'] },
      isAuthenticated: true,
      isBnBHost: false,
      isHotelRestaurantHost: false,
    });
    listingsAPI.getCombinedFavorites.mockResolvedValue({ results: [] });
    authAPI.getUserDashboard.mockResolvedValue({});
    const { bookingsAPI } = require('../../services/api');
    bookingsAPI.getBookings.mockResolvedValue({ results: [] });

    harness = createDomTestHarness();
    container = harness.container;
    settle = harness.settle;
    waitForCondition = harness.waitForCondition;
    click = harness.click;
  });

  afterEach(async () => {
    await harness.unmount();
  });

  it('calls HotelCard favorite handler with the hotel id', async () => {
    const onToggleFavorite = jest.fn();

    harness.render(
      <MemoryRouter future={routerFutureFlags}>
        <HotelCard
          hotel={{
            id: 21,
            name: 'Savannah Hotel',
            star_rating: 4,
            full_address: 'Nairobi, Kenya',
            short_description: 'Comfortable city hotel',
            property_type: 'hotel',
            amenity_count: 3,
            primary_image: null,
          }}
          onToggleFavorite={onToggleFavorite}
        />
      </MemoryRouter>
    );

    const btn = container.querySelector('button[aria-label="Add to favorites"]');
    expect(btn).toBeTruthy();
    click(btn);
    expect(onToggleFavorite).toHaveBeenCalledWith(21);
  });

  it('calls BnBCard favorite handler with listing id', async () => {
    const onToggleFavorite = jest.fn();

    harness.render(
      <MemoryRouter future={routerFutureFlags}>
        <BnBCard
          listing={{
            id: 33,
            title: 'Wote Retreat',
            city: 'Wote',
            country: 'Kenya',
            description: 'Quiet place',
            property_type: 'apartment',
            price_per_night: 2000,
            images: [],
          }}
          onToggleFavorite={onToggleFavorite}
        />
      </MemoryRouter>
    );

    const btn = container.querySelector('button[aria-label="Add to favorites"]');
    expect(btn).toBeTruthy();
    click(btn);
    expect(onToggleFavorite).toHaveBeenCalledWith(33);
  });

  it('filters dashboard favorites by All, Hotels, and BnBs chips', async () => {
    authAPI.getUserDashboard.mockResolvedValue({});
    listingsAPI.getCombinedFavorites.mockResolvedValue({
      results: [
        {
          id: 1,
          type: 'hotel',
          hotel: {
            id: 45,
            name: 'Nairobi Inn',
            short_description: 'Central hotel',
            city: 'Nairobi',
            country: 'Kenya',
          },
        },
        {
          id: 2,
          type: 'bnb',
          bnb_listing: {
            id: 78,
            title: 'Makueni Home',
            description: 'Clean and affordable',
            city: 'Wote',
            country: 'Kenya',
          },
        },
      ],
    });

    harness.render(
      <MemoryRouter initialEntries={['/dashboard']} future={routerFutureFlags}>
        <FavoritesProvider>
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Routes>
        </FavoritesProvider>
      </MemoryRouter>
    );
    await settle();

    const favoritesTab = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent.includes('Favorites')
    );
    expect(favoritesTab).toBeTruthy();
    click(favoritesTab);

    await waitForCondition(() => container.textContent.includes('All (2)'));
    await waitForCondition(() => container.textContent.includes('Saved • Hotel'));
    await waitForCondition(() => container.textContent.includes('Saved • BnB'));

    const hotelsChip = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent.includes('Hotels (1)')
    );
    const allChip = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent.includes('All (2)')
    );

    expect(hotelsChip).toBeTruthy();
    expect(allChip).toBeTruthy();

    click(hotelsChip);
    await waitForCondition(() => !container.textContent.includes('Saved • BnB'));
    expect(container.textContent.includes('Saved • Hotel')).toBe(true);

    const bnbsChip = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent.includes('BnBs (1)')
    );
    expect(bnbsChip).toBeTruthy();
    click(bnbsChip);
    await waitForCondition(() => !container.textContent.includes('Saved • Hotel'));
    expect(container.textContent.includes('Saved • BnB')).toBe(true);

    const allChipAgain = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent.includes('All (2)')
    );
    expect(allChipAgain).toBeTruthy();
    click(allChipAgain);
    await waitForCondition(
      () => container.textContent.includes('Saved • Hotel') && container.textContent.includes('Saved • BnB')
    );
  });

  it('shows retry action when favorites load fails', async () => {
    authAPI.getUserDashboard.mockResolvedValue({});
    listingsAPI.getCombinedFavorites.mockResolvedValueOnce({ results: [] });
    listingsAPI.getCombinedFavorites.mockRejectedValueOnce(new Error('network'));
    listingsAPI.getCombinedFavorites.mockResolvedValueOnce({ results: [] });

    harness.render(
      <MemoryRouter initialEntries={['/dashboard']} future={routerFutureFlags}>
        <FavoritesProvider>
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Routes>
        </FavoritesProvider>
      </MemoryRouter>
    );
    await settle();

    const favoritesTab = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent.includes('Favorites')
    );
    expect(favoritesTab).toBeTruthy();
    click(favoritesTab);

    await waitForCondition(() => container.textContent.includes('Failed to load favorites'));
    const retryButton = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent.includes('Retry')
    );
    expect(retryButton).toBeTruthy();

    click(retryButton);

    await waitForCondition(() => listingsAPI.getCombinedFavorites.mock.calls.length >= 2);
    await settle();
  });

  it('removes a hotel favorite directly from dashboard card', async () => {
    authAPI.getUserDashboard.mockResolvedValue({});
    listingsAPI.getCombinedFavorites.mockResolvedValue({
      results: [
        {
          id: 22,
          type: 'hotel',
          hotel: {
            id: 95,
            name: 'Town Hotel',
            short_description: 'Quick stay',
            city: 'Wote',
            country: 'Kenya',
          },
        },
      ],
    });
    listingsAPI.removeFavorite.mockResolvedValue({});

    harness.render(
      <MemoryRouter initialEntries={['/dashboard']} future={routerFutureFlags}>
        <FavoritesProvider>
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Routes>
        </FavoritesProvider>
      </MemoryRouter>
    );
    await settle();

    const favoritesTab = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent.includes('Favorites')
    );
    expect(favoritesTab).toBeTruthy();
    click(favoritesTab);

    await waitForCondition(() => container.textContent.includes('Town Hotel'));
    const removeButton = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent.includes('Remove')
    );
    expect(removeButton).toBeTruthy();
    click(removeButton);

    await waitForCondition(() => !container.textContent.includes('Town Hotel'));
    expect(listingsAPI.removeFavorite).toHaveBeenCalledWith(95);
    await settle();
  });
});
