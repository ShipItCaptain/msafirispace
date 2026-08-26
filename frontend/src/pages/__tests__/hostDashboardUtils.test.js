import {
  calculateHostStats,
  normalizeHostBookings,
  normalizeHostReviews,
} from '../dashboard/hostDashboardUtils';

describe('hostDashboardUtils', () => {
  it('normalizes host bookings for dashboard rendering fields', () => {
    const rows = normalizeHostBookings([
      {
        id: 9,
        traveler_name: 'Brian',
        hotel_name: 'Wote Hotel',
        room_name: 'Deluxe',
        check_in: '2026-03-10',
        check_out: '2026-03-12',
        total_amount: '5400.00',
        status: 'pending',
      },
    ]);

    expect(rows[0].guest).toBe('Brian');
    expect(rows[0].hotel_name).toBe('Wote Hotel');
    expect(rows[0].room_name).toBe('Deluxe');
    expect(rows[0].checkIn).toBe('2026-03-10');
    expect(rows[0].checkOut).toBe('2026-03-12');
    expect(rows[0].amount).toBe(5400);
  });

  it('normalizes review display fields', () => {
    const rows = normalizeHostReviews([{ id: 1, traveler_name: 'Jane', rating: 5, comment: 'Great', created_at: '2026-02-01T10:00:00Z' }]);
    expect(rows[0].guest).toBe('Jane');
    expect(rows[0].date).toBeTruthy();
  });

  it('calculates host stats safely', () => {
    const today = new Date().toISOString().split('T')[0];
    const stats = calculateHostStats({
      hotels: [{ id: 1, room_types: [{ id: 1 }, { id: 2 }] }],
      bookings: [
        {
          id: 1,
          status: 'confirmed',
          created_at: new Date().toISOString(),
          check_in: today,
          check_out: today,
          total_amount: 2000,
        },
        {
          id: 2,
          status: 'pending',
          created_at: new Date().toISOString(),
          check_in: '2026-04-01',
          check_out: '2026-04-02',
          total_amount: 1000,
        },
      ],
      reviews: [{ rating: 4 }, { rating: 5 }],
    });

    expect(stats.totalBookings).toBe(2);
    expect(stats.pendingBookings).toBe(1);
    expect(stats.totalRooms).toBe(2);
    expect(stats.averageRating).toBe(4.5);
    expect(stats.monthlyRevenue).toBe(3000);
  });
});
