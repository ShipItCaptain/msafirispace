from django.urls import path
from .views import (
    BookingListCreateView,
    BookingDetailView,
    cancel_booking,
    confirm_pay_at_premises,
    MyBookingsListView,
    HostBookingsListView,
    host_update_booking_status,
)

app_name = 'bookings'

urlpatterns = [
    path('', BookingListCreateView.as_view(), name='booking-list-create'),
    path('my-bookings/', MyBookingsListView.as_view(), name='booking-my-list'),
    path('host/', HostBookingsListView.as_view(), name='booking-host-list'),
    path('<int:pk>/', BookingDetailView.as_view(), name='booking-detail'),
    path('<int:pk>/cancel/', cancel_booking, name='booking-cancel'),
    path('<int:pk>/host-status/', host_update_booking_status, name='booking-host-status'),
    path('<int:pk>/confirm-pay-at-premises/', confirm_pay_at_premises, name='booking-confirm-pay-at-premises'),
]
