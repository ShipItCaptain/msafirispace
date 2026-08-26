export const buildHostAnalytics = (bookings = []) => {
  const lastSixMonths = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return {
      key,
      label: date.toLocaleDateString(undefined, { month: 'short' }),
      revenue: 0,
      bookings: 0,
    };
  });

  const monthMap = new Map(lastSixMonths.map((month) => [month.key, month]));
  const statusTotals = { pending: 0, confirmed: 0, cancelled: 0, completed: 0 };
  const propertyRevenueMap = new Map();

  bookings.forEach((booking) => {
    const amount = Number(booking.total_amount || booking.amount || 0);
    const createdAt = booking.created_at ? new Date(booking.created_at) : null;
    if (createdAt && !Number.isNaN(createdAt.getTime())) {
      const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
      const monthStat = monthMap.get(monthKey);
      if (monthStat) {
        monthStat.revenue += amount;
        monthStat.bookings += 1;
      }
    }

    if (statusTotals[booking.status] !== undefined) {
      statusTotals[booking.status] += 1;
    }

    const propertyName = booking.hotel_name || booking.bnb_listing_title || 'Property';
    propertyRevenueMap.set(propertyName, (propertyRevenueMap.get(propertyName) || 0) + amount);
  });

  const maxMonthlyRevenue = Math.max(...lastSixMonths.map((month) => month.revenue), 0);
  const topProperties = Array.from(propertyRevenueMap.entries())
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((left, right) => right.revenue - left.revenue)
    .slice(0, 5);

  return {
    monthlySeries: lastSixMonths,
    maxMonthlyRevenue,
    statusTotals,
    topProperties,
  };
};

const triggerDownload = (content, mimeType, filename) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const getDateRangeLabel = ({ summaryRange, summaryCustomFrom, summaryCustomTo }) => {
  if (summaryRange === 'custom') {
    return `${summaryCustomFrom || 'start'}_to_${summaryCustomTo || 'today'}`;
  }
  return summaryRange || 'all';
};

export const exportBookingsCsv = (bookings = [], options = {}) => {
  const headers = ['Booking ID', 'Guest', 'Property', 'Room', 'Check-in', 'Check-out', 'Status', 'Amount'];
  const toSafe = (value) => {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  };
  const rows = bookings.map((booking) => ([
    booking.id,
    booking.guest_name || 'Guest',
    booking.hotel_name || 'Property',
    booking.room_name || '—',
    booking.check_in || booking.checkIn || '',
    booking.check_out || booking.checkOut || '',
    booking.status || '',
    booking.total_amount || booking.amount || 0,
  ]));

  const rangeLabel = getDateRangeLabel(options);
  const csvContent = [
    `# Generated At,${new Date().toISOString()}`,
    `# Range,${rangeLabel}`,
    `# Records,${bookings.length}`,
    '',
    headers.map(toSafe).join(','),
    ...rows.map((row) => row.map(toSafe).join(',')),
  ].join('\n');

  triggerDownload(
    csvContent,
    'text/csv;charset=utf-8;',
    `host-bookings-${rangeLabel}-${new Date().toISOString().slice(0, 10)}.csv`
  );
};

export const exportBookingsExcel = (bookings = [], options = {}) => {
  const rangeLabel = getDateRangeLabel(options);
  const header = `
    <tr>
      <th>Booking ID</th><th>Guest</th><th>Property</th><th>Room</th>
      <th>Check-in</th><th>Check-out</th><th>Status</th><th>Amount</th>
    </tr>
  `;
  const rows = bookings.map((booking) => `
    <tr>
      <td>${booking.id ?? ''}</td>
      <td>${booking.guest_name || 'Guest'}</td>
      <td>${booking.hotel_name || 'Property'}</td>
      <td>${booking.room_name || '—'}</td>
      <td>${booking.check_in || booking.checkIn || ''}</td>
      <td>${booking.check_out || booking.checkOut || ''}</td>
      <td>${booking.status || ''}</td>
      <td>${booking.total_amount || booking.amount || 0}</td>
    </tr>
  `).join('');

  const html = `
    <html>
      <head><meta charset="UTF-8" /></head>
      <body>
        <table border="1">
          <tr><td colspan="8">Generated At: ${new Date().toISOString()}</td></tr>
          <tr><td colspan="8">Range: ${rangeLabel}</td></tr>
          <tr><td colspan="8">Records: ${bookings.length}</td></tr>
          ${header}
          ${rows}
        </table>
      </body>
    </html>
  `;

  triggerDownload(
    html,
    'application/vnd.ms-excel',
    `host-bookings-${rangeLabel}-${new Date().toISOString().slice(0, 10)}.xls`
  );
};
