"""
URL patterns for the Users app
"""
from django.urls import path
from . import views

app_name = 'users'

urlpatterns = [
    # Authentication endpoints
    path('register/', views.UserRegistrationView.as_view(), name='user-register'),
    path('login/', views.UserLoginView.as_view(), name='user-login'),
    path('logout/', views.UserLogoutView.as_view(), name='user-logout'),
    path('refresh/', views.TokenRefreshView.as_view(), name='token-refresh'),
    path('me/', views.MeView.as_view(), name='user-me'),
    # Roles
    path('roles/add/', views.AddRoleView.as_view(), name='user-role-add'),
    path('roles/switch/', views.SwitchRoleView.as_view(), name='user-role-switch'),
    path('roles/<str:role>/remove/', views.RemoveRoleView.as_view(), name='user-role-remove'),
    
    # Profile management
    path('profile/', views.UserProfileView.as_view(), name='user-profile'),
    path('detail/', views.UserDetailView.as_view(), name='user-detail'),
    path('dashboard/', views.user_dashboard, name='user-dashboard'),
    path('stats/', views.UserStatsView.as_view(), name='user-stats'),
    
    # Address management
    path('addresses/', views.UserAddressView.as_view(), name='user-addresses'),
    path('addresses/<int:pk>/', views.UserAddressDetailView.as_view(), name='user-address-detail'),
    
    # Password management
    path('change-password/', views.PasswordChangeView.as_view(), name='change-password'),
    path('reset-password/', views.PasswordResetRequestView.as_view(), name='reset-password-request'),
    path('reset-password/confirm/', views.PasswordResetConfirmView.as_view(), name='reset-password-confirm'),
    
    # Signup OTP verification (email or WhatsApp/phone)
    path('verify-code/', views.VerifyCodeView.as_view(), name='verify-code'),
    path('resend-code/', views.ResendCodeView.as_view(), name='resend-code'),
    
    # Referral system
    path('apply-referral/', views.ReferralView.as_view(), name='apply-referral'),
    path('referral-stats/', views.ReferralStatsView.as_view(), name='referral-stats'),
    
    # Host onboarding
    path('host/onboard/', views.HostOnboardingView.as_view(), name='host-onboard'),
    path('host/onboarding-status/', views.host_onboarding_status, name='host-onboarding-status'),
    path('host/dashboard/', views.HostDashboardView.as_view(), name='host-dashboard'),
    path('host/dashboard/summary/', views.HostDashboardSummaryView.as_view(), name='host-dashboard-summary'),
    path('host/hotel-restaurant/', views.HotelRestaurantHostProfileView.as_view(), name='hotel-restaurant-profile'),
    path('host/bnb/', views.BnBHostProfileView.as_view(), name='bnb-profile'),
]
