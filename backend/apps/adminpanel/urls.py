from django.urls import path

from . import views

urlpatterns = [
    path('auth/login/', views.AdminLoginStep1View.as_view(), name='admin-login-step1'),
    path('auth/login/verify/', views.AdminLoginStep2View.as_view(), name='admin-login-step2'),
    path('me/', views.AdminMeView.as_view(), name='admin-me'),

    path('users/', views.AdminUserListView.as_view(), name='admin-user-list'),
    path('users/<int:pk>/', views.AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('users/<int:pk>/suspend/', views.AdminUserSuspendView.as_view(), name='admin-user-suspend'),
    path('users/<int:pk>/activate/', views.AdminUserActivateView.as_view(), name='admin-user-activate'),

    path('bookings/', views.AdminBookingListView.as_view(), name='admin-booking-list'),
    path('bookings/<int:pk>/', views.AdminBookingDetailView.as_view(), name='admin-booking-detail'),
    path('bookings/<int:pk>/message-guest/', views.AdminBookingMessageGuestView.as_view(), name='admin-booking-message-guest'),

    path('dashboard/needs-attention/', views.NeedsAttentionView.as_view(), name='admin-needs-attention'),
    path('dashboard/stats/', views.AdminOverviewStatsView.as_view(), name='admin-overview-stats'),

    path('listings/hotels/', views.AdminHotelListView.as_view(), name='admin-hotel-list'),
    path('listings/hotels/<int:pk>/', views.AdminHotelDetailView.as_view(), name='admin-hotel-detail'),
    path('listings/hotels/<int:pk>/moderate/', views.AdminHotelModerateView.as_view(), name='admin-hotel-moderate'),
    path('listings/bnbs/', views.AdminBnBListingListView.as_view(), name='admin-bnb-list'),
    path('listings/bnbs/<int:pk>/', views.AdminBnBListingDetailView.as_view(), name='admin-bnb-detail'),
    path('listings/bnbs/<int:pk>/moderate/', views.AdminBnBListingModerateView.as_view(), name='admin-bnb-moderate'),

    path('promotions/', views.AdminPromotionListView.as_view(), name='admin-promotion-list'),
    path('promotions/<int:pk>/', views.AdminPromotionDetailView.as_view(), name='admin-promotion-detail'),
    path('promotions/<int:pk>/status/', views.AdminPromotionStatusView.as_view(), name='admin-promotion-status'),

    path('reviews/', views.AdminReviewListView.as_view(), name='admin-review-list'),
    path('reviews/<int:pk>/', views.AdminReviewDetailView.as_view(), name='admin-review-detail'),
    path('reviews/<int:pk>/visibility/', views.AdminReviewVisibilityView.as_view(), name='admin-review-visibility'),

    path('payments/', views.AdminPaymentListView.as_view(), name='admin-payment-list'),
    path('payments/intents/', views.AdminPaymentIntentListView.as_view(), name='admin-payment-intent-list'),
    path('payments/webhook-events/', views.AdminPaymentWebhookEventListView.as_view(), name='admin-payment-webhook-list'),

    path('admins/', views.AdminAdminsListView.as_view(), name='admin-admins-list'),
    path('admins/grant/', views.AdminGrantView.as_view(), name='admin-admins-grant'),
    path('admins/<int:pk>/revoke/', views.AdminRevokeView.as_view(), name='admin-admins-revoke'),

    path('audit-log/', views.AdminActionLogListView.as_view(), name='admin-audit-log'),
]
