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
jest.mock('../../components/bnb/FeaturedBnBs', () => () => <div data-testid="featured-bnbs" />);
jest.mock('../../components/promotions/DealsSection', () => () => <div data-testid="deals-section" />);

jest.mock('framer-motion', () => {
  const ReactLocal = require('react');
  const MockMotion = ReactLocal.forwardRef(
    ({ children, initial, animate, transition, exit, whileHover, whileTap, whileInView, viewport, ...rest }, ref) => (
      <div ref={ref} {...rest}>
        {children}
      </div>
    )
  );
  return {
    motion: new Proxy({}, { get: () => MockMotion }),
  };
});

const mockUseAuth = useAuth;

describe('Homepage always shows the guest experience', () => {
  let harness;

  beforeEach(() => {
    harness = createDomTestHarness();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await harness.unmount();
  });

  it('shows the guest homepage for a guest-only user', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, roles: ['guest'] },
      isAuthenticated: true,
    });

    harness.render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <HomePage />
      </MemoryRouter>
    );

    await harness.waitForCondition(() => harness.container.textContent.includes('Stays across East Africa'));
    expect(harness.container.querySelector('[data-testid="host-home-page"]')).toBeNull();
  });

  it('never swaps to HostHomePage, even for a user who holds host roles', async () => {
    // There's no more "mode switching" -- the homepage is always the guest
    // experience regardless of which roles a signed-in user holds. Hosts
    // reach their dashboard via an explicit nav link, never via "/" itself.
    mockUseAuth.mockReturnValue({
      user: { id: 1, roles: ['guest', 'bnb_host', 'hotel_host'] },
      isAuthenticated: true,
    });

    harness.render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <HomePage />
      </MemoryRouter>
    );

    await harness.waitForCondition(() => harness.container.textContent.includes('Stays across East Africa'));
    expect(harness.container.querySelector('[data-testid="host-home-page"]')).toBeNull();
  });
});
