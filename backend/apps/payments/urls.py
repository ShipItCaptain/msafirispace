from django.urls import path
from .views import (
    CreatePaymentIntentView,
    RetrievePaymentIntentView,
    PaymentHistoryView,
    SimulatePaymentSuccessView,
    WebhookPaystackView,
    WebhookMpesaView,
)

app_name = 'payments'

urlpatterns = [
    path('intents/', CreatePaymentIntentView.as_view(), name='payment-intent-create'),
    path('intents/<str:reference>/', RetrievePaymentIntentView.as_view(), name='payment-intent-detail'),
    path('history/', PaymentHistoryView.as_view(), name='payment-history'),
    path('simulate-success/', SimulatePaymentSuccessView.as_view(), name='payment-simulate-success'),
    path('webhooks/paystack/', WebhookPaystackView.as_view(), name='webhook-paystack'),
    path('webhooks/mpesa/', WebhookMpesaView.as_view(), name='webhook-mpesa'),
]
