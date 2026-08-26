const { test, expect, request } = require('@playwright/test');

const API_BASE_URL = process.env.E2E_API_URL || 'http://127.0.0.1:8000/api/v1';
const PASSWORD = 'testpass123';

const buildGuestIdentity = () => {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `e2e-guest-${suffix}@example.com`,
    username: `e2e_guest_${suffix}`,
  };
};

const loginGuest = async () => {
  const identity = buildGuestIdentity();
  const api = await request.newContext({ baseURL: API_BASE_URL });

  const registerRes = await api.post('/auth/register/', {
    data: {
      email: identity.email,
      username: identity.username,
      first_name: 'E2E',
      last_name: 'Guest',
      password: PASSWORD,
      password_confirm: PASSWORD,
      roles: ['guest'],
    },
  });
  expect(registerRes.ok()).toBeTruthy();

  const loginRes = await api.post('/auth/login/', {
    data: {
      email: identity.email,
      password: PASSWORD,
    },
  });
  expect(loginRes.ok()).toBeTruthy();
  const loginData = await loginRes.json();

  await api.dispose();
  return {
    access: loginData?.tokens?.access,
    refresh: loginData?.tokens?.refresh,
  };
};

const applyAuthToPage = async (page, tokens) => {
  await page.addInitScript(
    ({ access, refresh }) => {
      window.localStorage.setItem('accessToken', access);
      window.localStorage.setItem('refreshToken', refresh);
    },
    tokens
  );
};

test.describe('Guest booking click paths', () => {
  test('hotel booking flow works through UI', async ({ page }) => {
    const tokens = await loginGuest();
    await applyAuthToPage(page, tokens);

    await page.goto('/hotels');
    const firstHotelLink = page.locator('a[href^="/hotel/"]').first();
    await expect(firstHotelLink).toBeVisible();
    await firstHotelLink.click();

    const today = new Date();
    const checkIn = new Date(today);
    checkIn.setDate(today.getDate() + 5);
    const checkOut = new Date(today);
    checkOut.setDate(today.getDate() + 7);

    const toISODate = (value) => value.toISOString().slice(0, 10);
    await page.getByTestId('hotel-booking-checkin').fill(toISODate(checkIn));
    await page.getByTestId('hotel-booking-checkout').fill(toISODate(checkOut));
    await page.getByTestId('hotel-booking-submit').click();

    await expect(page).toHaveURL(/\/booking\/\d+/);
    await expect(page.getByText('Booking Details')).toBeVisible();
  });

  test('bnb booking flow works through UI', async ({ page }) => {
    const tokens = await loginGuest();
    await applyAuthToPage(page, tokens);

    await page.goto('/bnbs');
    const firstBnBLink = page.locator('a[href^="/bnb/"]').first();
    await expect(firstBnBLink).toBeVisible();
    await firstBnBLink.click();

    const today = new Date();
    const checkIn = new Date(today);
    checkIn.setDate(today.getDate() + 8);
    const checkOut = new Date(today);
    checkOut.setDate(today.getDate() + 10);

    const toISODate = (value) => value.toISOString().slice(0, 10);
    await page.getByTestId('bnb-booking-checkin').fill(toISODate(checkIn));
    await page.getByTestId('bnb-booking-checkout').fill(toISODate(checkOut));
    await page.getByTestId('bnb-booking-submit').click();

    await expect(page).toHaveURL(/\/booking\/\d+/);
    await expect(page.getByText('Booking Details')).toBeVisible();
  });
});
