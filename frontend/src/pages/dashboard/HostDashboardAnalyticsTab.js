import React from 'react';

const HostDashboardAnalyticsTab = ({ analyticsData, bookingsCount, formatCurrency }) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Revenue Trends</h3>
        <p className="text-xs text-gray-500 mb-4">Last 6 months by booking creation date</p>
        <div className="h-64 flex items-end gap-2">
          {analyticsData.monthlySeries.map((month) => {
            const heightPercent = analyticsData.maxMonthlyRevenue > 0
              ? Math.max((month.revenue / analyticsData.maxMonthlyRevenue) * 100, 8)
              : 8;
            return (
              <div key={month.key} className="flex-1 min-w-0">
                <div className="h-48 flex items-end">
                  <div
                    className="w-full bg-blue-500/85 rounded-t-md transition-all"
                    style={{ height: `${heightPercent}%` }}
                    title={`${month.label}: ${formatCurrency(month.revenue)} (${month.bookings} bookings)`}
                  />
                </div>
                <p className="mt-2 text-[11px] text-center text-gray-500">{month.label}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-xs text-gray-600">
          Total (6m):{' '}
          <span className="font-semibold text-gray-900">
            {formatCurrency(analyticsData.monthlySeries.reduce((sum, month) => sum + month.revenue, 0))}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Booking Status Breakdown</h3>
        <p className="text-xs text-gray-500 mb-4">Current filtered host bookings</p>
        <div className="space-y-3">
          {[
            ['confirmed', 'Confirmed', 'bg-green-500'],
            ['pending', 'Pending', 'bg-yellow-500'],
            ['completed', 'Completed', 'bg-blue-500'],
            ['cancelled', 'Cancelled', 'bg-red-500'],
          ].map(([key, label, color]) => {
            const count = analyticsData.statusTotals[key] || 0;
            const percentage = bookingsCount ? Math.round((count / bookingsCount) * 100) : 0;
            return (
              <div key={key}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-700">{label}</span>
                  <span className="font-medium text-gray-900">{count} ({percentage}%)</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${color}`} style={{ width: `${percentage}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-5 pt-4 border-t border-gray-100">
          <p className="text-sm font-medium text-gray-900 mb-2">Top properties by revenue</p>
          <div className="space-y-2">
            {analyticsData.topProperties.length ? analyticsData.topProperties.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 truncate pr-3">{entry.name}</span>
                <span className="font-medium text-gray-900">{formatCurrency(entry.revenue)}</span>
              </div>
            )) : (
              <p className="text-sm text-gray-500">No revenue data yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default HostDashboardAnalyticsTab;
