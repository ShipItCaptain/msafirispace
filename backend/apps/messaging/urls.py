from django.urls import path
from .views import MessageListCreateView

app_name = 'messaging'

urlpatterns = [
    path('bookings/<int:booking_id>/messages/', MessageListCreateView.as_view(), name='booking-messages'),
]
