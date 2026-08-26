import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from '../HomePage';
import { useAuth } from '../../hooks/useAuth';
import { createDomTestHarness } from '../../test/testHarness';

jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../HostHomePage', () => () => <div data-testid="host-home-page">Host Home</div>);
jest.mock('../../components/hotel/FeaturedHotels', () => () => <div data-testid="featured-hotels" />);
jest.mock('../../services/api', () => ({
  bnbAPI: {
    getListings: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('framer-motion', () => {
  const ReactLocal = require('react');
  const MockMotion = ReactLocal.forwardRef(({ children, ...rest }, ref) => (
    <div ref={ref} {...rest}>
      {children}
    </div>
  ));
  return {
    motion: new Proxy({}, { get: () => MockMotion }),
  };
});

const mockUseAuth = useAuth;

describe('Role flow redirect guards', () => {
  let harness;

  beforeEach(() => {
    harness = createDomTestHarness();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await harness.unmount();
  });

  it('does not force host home when active role is guest even if host role exists', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, active_role: 'guest', roles: ['guest', 'bnb_host'] },
      isAuthenticated: true,
    });

    harness.render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await harness.waitForCondition(() => harness.container.textContent.includes('Find your next stay'));
    expect(harness.container.querySelector('[data-testid="host-home-page"]')).toBeNull();
  });

  it('shows host home when active role is a host role', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, active_role: 'bnb_host', roles: ['guest', 'bnb_host'] },
      isAuthenticated: true,
    });

    harness.render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await harness.waitForCondition(() => harness.container.querySelector('[data-testid="host-home-page"]'));
    expect(harness.container.querySelector('[data-testid="host-home-page"]')).toBeTruthy();
  });
});
