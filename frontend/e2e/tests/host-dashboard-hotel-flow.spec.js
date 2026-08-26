const { test, expect, request } = require('@playwright/test');
const path = require('path');

const API_BASE_URL = process.env.E2E_API_URL || 'http://127.0.0.1:8000/api/v1';
const PASSWORD = 'testpass123';

const buildHostIdentity = () => {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `e2e-hotel-host-${suffix}@example.com`,
    username: `e2e_hotel_host_${suffix}`,
  };
};

const loginHotelHost = async () => {
  const identity = buildHostIdentity();
  const api = await request.newContext({ baseURL: API_BASE_URL });

  const registerRes = await api.post('/auth/register/', {
    data: {
      email: identity.email,
      username: identity.username,
      first_name: 'E2E',
      last_name: 'Host',
      password: PASSWORD,
      password_confirm: PASSWORD,
      roles: ['hotel_host', 'guest'],
      company_name: 'E2E Hotels Ltd',
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

test.describe('Host dashboard hotel listing flow', () => {
  test('host can create a hotel listing from dashboard', async ({ page }) => {
    const tokens = await loginHotelHost();
    await applyAuthToPage(page, tokens);

    await page.goto('/host-dashboard');
    await expect(page.getByRole('heading', { name: 'Hotel Host Dashboard' })).toBeVisible();

    await page.getByRole('button', { name: 'My Hotels' }).click();
    await page.getByTestId('host-add-hotel-button').click();

    const hotelName = `E2E Hotel ${Date.now()}`;

    await page.getByTestId('host-hotel-name-input').fill(hotelName);
    await page.getByTestId('host-hotel-description-input').fill('End-to-end test hotel description.');
    await page.getByLabel('Property Type').selectOption('hotel');
    await page.getByTestId('host-hotel-star-4').click();

    await page.getByTestId('host-hotel-continue-button').click();

    await page.getByTestId('host-hotel-address-input').fill('E2E Avenue 123');
    await page.getByTestId('host-hotel-city-input').fill('Nairobi');
    await page.getByTestId('host-hotel-phone-input').fill('+254700000001');
    await page.getByTestId('host-hotel-email-input').fill('e2e-hotel@example.com');

    await page.getByTestId('host-hotel-continue-button').click();

    await page.getByTestId('host-hotel-amenity-wi-fi').check();
    await page.getByTestId('host-hotel-amenity-pool').check();

    const imagePath = path.resolve(__dirname, '../fixtures/hotel-test-image.png');
    await page.getByTestId('host-hotel-images-input').setInputFiles(imagePath);
    await expect(page.getByTestId('host-hotel-images-preview-grid').locator('img')).toHaveCount(1);

    await page.getByTestId('host-hotel-continue-button').click();
    await expect(page.getByTestId('host-hotel-step-4')).toBeVisible();

    await page.getByTestId('host-room-name-0').fill('Deluxe King');
    await page.getByTestId('host-room-description-0').fill('Deluxe king room with balcony.');
    await page.getByTestId('host-room-price-0').fill('8500');

    await page.getByTestId('host-add-room-type-button').click();

    await page.getByTestId('host-room-name-1').fill('Family Suite');
    await page.getByTestId('host-room-description-1').fill('Family suite with kitchenette.');
    await page.getByTestId('host-room-price-1').fill('13500');

    await page.getByTestId('host-hotel-continue-button').click();
    await expect(page.getByTestId('host-hotel-step-5')).toBeVisible();
    await expect(page.getByTestId('host-hotel-images-review-grid').locator('img')).toHaveCount(1);
    await page.getByTestId('host-hotel-submit-button').click();

    const api = await request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: { Authorization: `Bearer ${tokens.access}` },
    });
    const listingsRes = await api.get('/listings/my-listings/');
    expect(listingsRes.ok()).toBeTruthy();
    const listingsData = await listingsRes.json();
    const rows = listingsData?.results || listingsData || [];
    const created = rows.find((row) => row?.name === hotelName);
    expect(created).toBeTruthy();
    expect(created?.primary_image).toBeTruthy();

    const hotelId = created?.id;
    const detailRes = await api.get(`/listings/hotels/${hotelId}/`);
    expect(detailRes.ok()).toBeTruthy();
    const detail = await detailRes.json();
    expect((detail?.amenity_mappings || []).length).toBeGreaterThanOrEqual(2);

    const roomsRes = await api.get(`/listings/hotels/${hotelId}/rooms/`);
    expect(roomsRes.ok()).toBeTruthy();
    const roomsData = await roomsRes.json();
    const rooms = roomsData?.results || roomsData || [];
    expect(rooms.length).toBeGreaterThanOrEqual(2);
    await api.dispose();

    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: 'My Hotels' }).click();
    await expect(page.getByText(hotelName).first()).toBeVisible();
  });
});
