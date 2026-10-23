"""
Views for the Users app
"""
from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

from msafiri.permissions import IsOwner
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.db import transaction
from django.db.models import Avg, Q, Sum
from datetime import timedelta
from collections import Counter
import logging
import secrets
import string

from .serializers import (
    UserRegistrationSerializer, UserLoginSerializer, UserProfileSerializer,
    UserUpdateSerializer, UserAddressSerializer, UserDetailSerializer,
    PasswordChangeSerializer, PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    VerifyCodeSerializer, ResendCodeSerializer,
    ReferralSerializer, UserStatsSerializer,
    AddRoleSerializer, SwitchRoleSerializer,
    HotelRestaurantHostProfileSerializer, BnBHostProfileSerializer,
    HostOnboardingSerializer
)
from .models import User, UserProfile, UserAddress
from .services.otp import send_verification_code, check_code

logger = logging.getLogger(__name__)
User = get_user_model()


class UserRegistrationView(APIView):
    """
    User registration endpoint
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            try:
                with transaction.atomic():
                    user = serializer.save()

                    # Send the signup verification code on whichever channel
                    # the user picked. A send failure shouldn't roll back
                    # account creation -- the user can still request a resend.
                    try:
                        send_verification_code(user)
                    except Exception:
                        logger.exception(
                            'Failed to send signup verification code to %s',
                            user.email,
                        )

                    return Response({
                        'message': (
                            'Registration successful. We sent a verification code to your '
                            + ('email.' if user.verification_method == 'email' else 'phone.')
                        ),
                        'user': {
                            'id': user.id,
                            'email': user.email,
                            'first_name': user.first_name,
                            'last_name': user.last_name,
                            'verification_method': user.verification_method,
                            'account_verified': user.account_verified,
                        },
                    }, status=status.HTTP_201_CREATED)

            except Exception as e:
                return Response({
                    'error': 'Registration failed. Please try again.',
                    'detail': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserLoginView(APIView):
    """
    User login endpoint
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']

            if not user.account_verified:
                return Response({
                    'error': 'account_not_verified',
                    'message': 'Please verify your account before logging in.',
                    'email': user.email,
                    'verification_method': user.verification_method,
                }, status=status.HTTP_403_FORBIDDEN)

            # Update last login
            user.last_login = timezone.now()
            user.save()
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'message': 'Login successful',
                'user': UserDetailSerializer(user).data,
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                }
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserLogoutView(APIView):
    """
    User logout endpoint
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh_token')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': 'Logout failed'}, status=status.HTTP_400_BAD_REQUEST)


class TokenRefreshView(APIView):
    """
    Token refresh endpoint
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response({'error': 'Refresh token is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            token = RefreshToken(refresh_token)
            access_token = token.access_token
            
            return Response({
                'access': str(access_token),
                'refresh': str(token)
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': 'Invalid refresh token'}, status=status.HTTP_401_UNAUTHORIZED)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    User profile view - retrieve and update
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserProfileSerializer
    
    def get_object(self):
        return self.request.user.extended_profile
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response({
            'message': 'Profile updated successfully',
            'profile': serializer.data
        }, status=status.HTTP_200_OK)


class UserDetailView(generics.RetrieveUpdateAPIView):
    """
    User detail view - retrieve and update basic info
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserDetailSerializer
    
    def get_object(self):
        return self.request.user
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response({
            'message': 'User information updated successfully',
            'user': serializer.data
        }, status=status.HTTP_200_OK)


class UserAddressView(generics.ListCreateAPIView):
    """
    User addresses - list and create
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserAddressSerializer
    
    def get_queryset(self):
        return UserAddress.objects.filter(user=self.request.user, is_active=True)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        return Response({
            'message': 'Address added successfully',
            'address': serializer.data
        }, status=status.HTTP_201_CREATED)


class UserAddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    User address detail - retrieve, update, delete
    """
    permission_classes = [permissions.IsAuthenticated, IsOwner]
    serializer_class = UserAddressSerializer
    
    def get_queryset(self):
        return UserAddress.objects.filter(user=self.request.user, is_active=True)
    
    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response({
            'message': 'Address updated successfully',
            'address': serializer.data
        }, status=status.HTTP_200_OK)


class PasswordChangeView(APIView):
    """
    Password change endpoint
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            
            # Check old password
            if not user.check_password(serializer.validated_data['old_password']):
                return Response({
                    'error': 'Current password is incorrect'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Set new password
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            return Response({
                'message': 'Password changed successfully'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(APIView):
    """
    Password reset request endpoint
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            user = User.objects.filter(email=email, is_active=True).first()

            # Only generate a token and send mail if the account actually
            # exists, but respond identically either way -- the response
            # itself must not reveal whether the email is registered.
            if user:
                token = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
                user.password_reset_token = token
                user.password_reset_expires = timezone.now() + timezone.timedelta(hours=24)
                user.save()

                if settings.EMAIL_BACKEND != 'django.core.mail.backends.console.EmailBackend':
                    send_mail(
                        'Password Reset - Msafiri Space',
                        f'Click here to reset your password: {settings.SITE_URL}/reset-password/{token}',
                        settings.DEFAULT_FROM_EMAIL,
                        [user.email],
                        fail_silently=True,
                    )

            return Response({
                'message': 'If an account exists with that email, a password reset link has been sent.'
            }, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetConfirmView(APIView):
    """
    Password reset confirmation endpoint
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            token = serializer.validated_data['token']
            
            try:
                user = User.objects.get(
                    password_reset_token=token,
                    password_reset_expires__gt=timezone.now(),
                    is_active=True
                )
                
                # Set new password
                user.set_password(serializer.validated_data['new_password'])
                user.password_reset_token = None
                user.password_reset_expires = None
                user.save()
                
                return Response({
                    'message': 'Password reset successfully'
                }, status=status.HTTP_200_OK)
                
            except User.DoesNotExist:
                return Response({
                    'error': 'Invalid or expired reset token'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyCodeView(APIView):
    """
    Confirms the signup verification code (sent via email or WhatsApp/phone)
    and activates the account. This is the only place JWTs are issued after
    registration -- registration itself no longer logs the user in.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyCodeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        code = serializer.validated_data['code']
        generic_error = {'error': 'Invalid or expired verification code.'}

        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if not user or user.account_verified or not user.verification_code_hash:
            return Response(generic_error, status=status.HTTP_400_BAD_REQUEST)

        if user.verification_code_attempts >= settings.OTP_MAX_ATTEMPTS:
            return Response({
                'error': 'Too many incorrect attempts. Please request a new code.'
            }, status=status.HTTP_400_BAD_REQUEST)

        if not user.verification_code_expires or user.verification_code_expires < timezone.now():
            return Response(generic_error, status=status.HTTP_400_BAD_REQUEST)

        if not check_code(user, code):
            user.verification_code_attempts += 1
            user.save(update_fields=['verification_code_attempts'])
            return Response(generic_error, status=status.HTTP_400_BAD_REQUEST)

        user.account_verified = True
        if user.verification_method == 'email':
            user.email_verified = True
        elif user.verification_method == 'phone':
            user.phone_verified = True
        user.verification_code_hash = None
        user.verification_code_expires = None
        user.verification_code_attempts = 0
        user.save()

        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'Account verified successfully.',
            'user': UserDetailSerializer(user).data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }
        }, status=status.HTTP_200_OK)


class ResendCodeView(APIView):
    """
    Requests a new signup verification code. Always returns the same
    generic response regardless of whether the account exists or is
    already verified, to avoid leaking account existence via this endpoint.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'otp_resend'

    def post(self, request):
        serializer = ResendCodeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        user = User.objects.filter(email__iexact=email, is_active=True, account_verified=False).first()

        if user:
            if user.verification_last_sent_at:
                elapsed = (timezone.now() - user.verification_last_sent_at).total_seconds()
                if elapsed < settings.OTP_RESEND_COOLDOWN_SECONDS:
                    return Response({
                        'error': 'Please wait before requesting another code.'
                    }, status=status.HTTP_429_TOO_MANY_REQUESTS)

            try:
                send_verification_code(user)
            except Exception:
                logger.exception(
                    'Failed to resend verification code to %s',
                    user.email,
                )

        return Response({
            'message': 'If an account exists and is not yet verified, a new code has been sent.'
        }, status=status.HTTP_200_OK)


class ReferralView(APIView):
    """
    Referral code application endpoint
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ReferralSerializer(data=request.data)
        if serializer.is_valid():
            referral_code = serializer.validated_data['referral_code']
            
            # Check if user already has a referrer
            if request.user.referred_by:
                return Response({
                    'error': 'You have already used a referral code'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if user is trying to use their own referral code
            if request.user.referral_code == referral_code:
                return Response({
                    'error': 'You cannot use your own referral code'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                referrer = User.objects.get(referral_code=referral_code, is_active=True)
                request.user.referred_by = referrer
                request.user.save()
                
                return Response({
                    'message': 'Referral code applied successfully'
                }, status=status.HTTP_200_OK)
                
            except User.DoesNotExist:
                return Response({
                    'error': 'Invalid referral code'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ReferralStatsView(APIView):
    """
    A user's own referral code/link plus who they've referred so far.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        referred_users = User.objects.filter(referred_by=user).order_by('-created_at')

        return Response({
            'referral_code': user.referral_code,
            'referral_link': f'{settings.SITE_URL}/register?ref={user.referral_code}',
            'referred_count': referred_users.count(),
            'referred_by': user.referred_by.get_display_name() if user.referred_by_id else None,
            'referred_users': [
                {
                    'name': referred.get_display_name(),
                    'joined_at': referred.created_at,
                }
                for referred in referred_users
            ],
        })


class UserStatsView(APIView):
    """
    User statistics endpoint
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user

        from apps.bookings.models import Booking
        from apps.payments.models import Payment
        from apps.reviews.models import Review

        bookings_qs = Booking.objects.filter(traveler=user).select_related('hotel', 'bnb_listing')
        reviews_qs = Review.objects.filter(traveler=user, is_public=True)
        successful_payments_qs = Payment.objects.filter(
            traveler=user,
            status=Payment.Status.SUCCESS,
        )

        destination_counter = Counter()
        for booking in bookings_qs:
            city = booking.bnb_listing.city if booking.bnb_listing_id else (booking.hotel.city if booking.hotel_id else '')
            country = booking.bnb_listing.country if booking.bnb_listing_id else (booking.hotel.country if booking.hotel_id else '')
            label = ', '.join([part for part in [city, country] if part])
            if label:
                destination_counter[label] += 1

        avg_rating = reviews_qs.aggregate(avg=Avg('rating'))['avg'] or 0
        total_spent = successful_payments_qs.aggregate(total=Sum('amount'))['total'] or 0
        stats = {
            'total_bookings': bookings_qs.count(),
            'total_reviews': reviews_qs.count(),
            'average_rating': round(avg_rating, 2),
            'total_spent': total_spent,
            'favorite_destinations': [item[0] for item in destination_counter.most_common(5)],
            'member_since': user.created_at
        }
        
        serializer = UserStatsSerializer(stats)
        return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_dashboard(request):
    """
    User dashboard endpoint
    """
    user = request.user

    from apps.bookings.models import Booking
    from apps.listings.models import Favorite, BnBFavorite, BnBListing, Hotel
    from apps.reviews.models import Review

    today = timezone.now().date()
    bookings_qs = Booking.objects.filter(traveler=user).select_related(
        'hotel', 'room_type', 'bnb_listing'
    ).order_by('-created_at')
    reviews_qs = Review.objects.filter(traveler=user, is_public=True)

    upcoming_qs = bookings_qs.filter(
        check_in__gte=today,
        status__in=[Booking.BookingStatus.PENDING, Booking.BookingStatus.CONFIRMED],
    ).order_by('check_in')
    pending_qs = bookings_qs.filter(status=Booking.BookingStatus.PENDING)
    pending_amount = pending_qs.aggregate(total=Sum('total_amount'))['total'] or 0

    hotel_favorites_qs = Favorite.objects.filter(user=user).select_related('hotel').order_by('-created_at')
    bnb_favorites_qs = BnBFavorite.objects.filter(user=user).select_related('bnb_listing').order_by('-created_at')

    favorites = (
        [
            {
                'type': 'hotel',
                'id': fav.hotel_id,
                'name': fav.hotel.name,
                'city': fav.hotel.city,
                'country': fav.hotel.country,
                'created_at': fav.created_at,
            }
            for fav in hotel_favorites_qs
        ]
        + [
            {
                'type': 'bnb',
                'id': fav.bnb_listing_id,
                'name': fav.bnb_listing.title,
                'city': fav.bnb_listing.city,
                'country': fav.bnb_listing.country,
                'created_at': fav.created_at,
            }
            for fav in bnb_favorites_qs
        ]
    )
    favorites.sort(key=lambda item: item['created_at'], reverse=True)

    recent_activity = []
    for booking in bookings_qs[:5]:
        property_name = (
            booking.bnb_listing.title if booking.bnb_listing_id
            else booking.hotel.name if booking.hotel_id
            else 'Property'
        )
        recent_activity.append({
            'type': 'booking',
            'booking_id': booking.id,
            'property': property_name,
            'status': booking.status,
            'date': booking.created_at.date().isoformat(),
            'check_in': booking.check_in.isoformat(),
            'check_out': booking.check_out.isoformat(),
            'amount': booking.total_amount,
            'currency': booking.currency,
        })

    upcoming_trips = []
    for booking in upcoming_qs[:5]:
        property_name = (
            booking.bnb_listing.title if booking.bnb_listing_id
            else booking.hotel.name if booking.hotel_id
            else 'Property'
        )
        upcoming_trips.append({
            'booking_id': booking.id,
            'property': property_name,
            'date': booking.check_in.isoformat(),
            'check_out': booking.check_out.isoformat(),
            'status': booking.status,
            'amount': booking.total_amount,
            'currency': booking.currency,
        })

    visited_destinations = set()
    for booking in bookings_qs:
        if booking.bnb_listing_id:
            visited_destinations.add((booking.bnb_listing.city, booking.bnb_listing.country))
        elif booking.hotel_id:
            visited_destinations.add((booking.hotel.city, booking.hotel.country))

    recommendation_candidates = []
    if visited_destinations:
        city_filters = [Q(city=city, country=country) for city, country in visited_destinations if city and country]
        if city_filters:
            hotel_query = city_filters[0]
            bnb_query = city_filters[0]
            for city_filter in city_filters[1:]:
                hotel_query |= city_filter
                bnb_query |= city_filter
            recommendation_candidates.extend(
                [
                    {
                        'type': 'hotel',
                        'id': hotel.id,
                        'title': hotel.name,
                        'city': hotel.city,
                        'country': hotel.country,
                    }
                    for hotel in Hotel.objects.filter(is_active=True).filter(hotel_query)[:3]
                ]
            )
            recommendation_candidates.extend(
                [
                    {
                        'type': 'bnb',
                        'id': bnb.id,
                        'title': bnb.title,
                        'city': bnb.city,
                        'country': bnb.country,
                    }
                    for bnb in BnBListing.objects.filter(is_active=True).filter(bnb_query)[:3]
                ]
            )

    if not recommendation_candidates:
        recommendation_candidates.extend(
            [
                {
                    'type': 'hotel',
                    'id': hotel.id,
                    'title': hotel.name,
                    'city': hotel.city,
                    'country': hotel.country,
                }
                for hotel in Hotel.objects.filter(is_active=True).order_by('-created_at')[:3]
            ]
        )
        recommendation_candidates.extend(
            [
                {
                    'type': 'bnb',
                    'id': bnb.id,
                    'title': bnb.title,
                    'city': bnb.city,
                    'country': bnb.country,
                }
                for bnb in BnBListing.objects.filter(is_active=True).order_by('-created_at')[:3]
            ]
        )

    average_rating = reviews_qs.aggregate(avg=Avg('rating'))['avg'] or 0
    dashboard_data = {
        'user': UserDetailSerializer(user).data,
        'quick_stats': {
            'total_bookings': bookings_qs.count(),
            'pending_bookings': upcoming_qs.count(),
            'pending_bookings_amount': float(pending_amount),
            'total_reviews': reviews_qs.count(),
            'average_rating': round(float(average_rating), 2),
        },
        'recent_activity': recent_activity,
        'upcoming_trips': upcoming_trips,
        'recommendations': recommendation_candidates[:6],
        'favorites': favorites[:10],
    }
    
    return Response(dashboard_data, status=status.HTTP_200_OK)


class MeView(APIView):
    """
    Current authenticated user overview (including roles and active_role)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserDetailSerializer(request.user).data, status=status.HTTP_200_OK)


class AddRoleView(APIView):
    """
    Add a role to the current user
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = AddRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role = serializer.validated_data['role']
        user: User = request.user
        user.add_role(role)
        # If user had only guest before, set active to new role
        if user.active_role == user.Role.GUEST:
            user.active_role = role
        user.save()
        # Refresh user from DB to get latest data
        user.refresh_from_db()
        return Response({
            'message': 'Role added',
            'user': UserDetailSerializer(user).data,
        }, status=status.HTTP_200_OK)


class RemoveRoleView(APIView):
    """
    Remove a role from the current user (cannot remove guest)
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, role):
        user: User = request.user
        if role == user.Role.GUEST:
            return Response({'error': 'Cannot remove guest role'}, status=status.HTTP_400_BAD_REQUEST)
        if role not in (user.roles or []):
            return Response({'error': 'Role not assigned'}, status=status.HTTP_404_NOT_FOUND)
        user.remove_role(role)
        user.save()
        # Refresh user from DB to get latest data
        user.refresh_from_db()
        return Response({
            'message': 'Role removed',
            'user': UserDetailSerializer(user).data,
        }, status=status.HTTP_200_OK)


class SwitchRoleView(APIView):
    """
    Switch active role context
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = SwitchRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role = serializer.validated_data['role']
        user: User = request.user
        if not user.switch_active_role(role):
            return Response({'error': 'Role not available'}, status=status.HTTP_400_BAD_REQUEST)
        user.save()
        # Refresh user from DB to get latest data
        user.refresh_from_db()
        return Response({
            'message': 'Active role switched',
            'user': UserDetailSerializer(user).data,
        }, status=status.HTTP_200_OK)


class HostOnboardingView(APIView):
    """
    Host onboarding wizard submission (KYC): account type, host category,
    and the type-specific identity/business details, all in one call. Only
    records the host's KYC profile -- it does NOT grant a bnb_host/hotel_host
    role by itself. Roles are still granted at listing-creation time (see
    HotelListCreateView/BnBListingListCreateView.perform_create), so
    completing KYC alone doesn't unlock host-only routes before the host has
    actually published anything.

    Reachable while signed out: the wizard's KYC fields (name, contact
    email/phone, plus a password collected only in this case) double as the
    account's registration details, so a first-time host never has to fill
    out a separate sign-up form with the same information a second time.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = HostOnboardingSerializer(data=request.data, context={'user': request.user})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            tokens = None
            if request.user.is_authenticated:
                user = request.user
            else:
                user = serializer.create_account(serializer.validated_data)
                serializer.context['user'] = user
                refresh = RefreshToken.for_user(user)
                tokens = {'access': str(refresh.access_token), 'refresh': str(refresh)}

            host_category = serializer.validated_data['host_category']
            user.user_type = User.UserType.HOST
            user.host_type = (
                User.HostType.HOTEL_RESTAURANT_HOST if host_category == 'hotel_restaurant'
                else User.HostType.BNB_HOST
            )
            user.save(update_fields=['user_type', 'host_type'])

            host_profile = serializer.save()

            if host_category == 'hotel_restaurant':
                profile_data = HotelRestaurantHostProfileSerializer(host_profile).data
            else:
                profile_data = BnBHostProfileSerializer(host_profile).data

            response_data = {
                'message': 'Host onboarding completed successfully',
                'host_category': host_category,
                'host_profile': profile_data,
            }
            if tokens:
                response_data['tokens'] = tokens
                response_data['user'] = UserDetailSerializer(user).data
            return Response(response_data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def host_onboarding_status(request):
    """
    Lightweight check for whether the current user has already completed
    the host onboarding wizard, and which category -- lets the entry point
    (BecomeHostPage) skip straight past Steps 1-3 for a returning host.
    """
    user = request.user
    bnb_profile = getattr(user, 'bnb_profile', None)
    hotel_profile = getattr(user, 'hotel_restaurant_profile', None)

    if bnb_profile and bnb_profile.onboarding_completed_at:
        return Response({'onboarding_completed': True, 'host_category': 'bnb'})
    if hotel_profile and hotel_profile.onboarding_completed_at:
        return Response({'onboarding_completed': True, 'host_category': 'hotel_restaurant'})
    return Response({'onboarding_completed': False, 'host_category': None})


class HotelRestaurantHostProfileView(APIView):
    """
    Hotel/Restaurant host profile management
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get hotel/restaurant host profile"""
        try:
            profile = request.user.hotel_restaurant_profile
            serializer = HotelRestaurantHostProfileSerializer(profile)
            return Response(serializer.data)
        except:
            return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)
    
    def put(self, request):
        """Update hotel/restaurant host profile"""
        try:
            profile = request.user.hotel_restaurant_profile
            serializer = HotelRestaurantHostProfileSerializer(profile, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except:
            return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)


class BnBHostProfileView(APIView):
    """
    BnB host profile management
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get BnB host profile"""
        try:
            profile = request.user.bnb_profile
            serializer = BnBHostProfileSerializer(profile)
            return Response(serializer.data)
        except:
            return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)
    
    def put(self, request):
        """Update BnB host profile"""
        try:
            profile = request.user.bnb_profile
            serializer = BnBHostProfileSerializer(profile, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except:
            return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)


class HostDashboardView(APIView):
    """
    Host dashboard data
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get host dashboard statistics"""
        user = request.user

        # Check if user is a host. `roles` (not the legacy `user_type`/`is_host`
        # field) is the actual source of truth used everywhere else in the app
        # (RoleGuard, RoleSwitcher, listing creation) — a user can hold a host
        # role there without user_type ever having been set to HOST.
        if not set(user.roles or []) & {User.Role.BNB_HOST, User.Role.HOTEL_HOST}:
            return Response({'error': 'User is not a host'}, status=status.HTTP_403_FORBIDDEN)

        from apps.bookings.models import Booking
        from apps.listings.models import BnBListing, Hotel, RoomType
        from apps.reviews.models import Review
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        selected_range = request.query_params.get('range')

        if selected_range in {'7d', '30d', '90d'}:
            days = int(selected_range.replace('d', ''))
            date_to_value = timezone.now().date()
            date_from_value = date_to_value - timedelta(days=days)
        else:
            date_to_value = date_to or timezone.now().date()
            date_from_value = date_from

        host_bookings = Booking.objects.filter(
            Q(hotel__host=user) | Q(bnb_listing__host=user)
        ).select_related('hotel', 'bnb_listing')

        filtered_bookings = host_bookings
        if date_from_value:
            filtered_bookings = filtered_bookings.filter(created_at__date__gte=date_from_value)
        if date_to_value:
            filtered_bookings = filtered_bookings.filter(created_at__date__lte=date_to_value)

        total_bookings = filtered_bookings.count()
        pending_bookings = filtered_bookings.filter(status=Booking.BookingStatus.PENDING).count()
        total_revenue = sum(float(booking.total_amount or 0) for booking in filtered_bookings)

        today = timezone.now().date()
        today_check_ins = host_bookings.filter(
            status=Booking.BookingStatus.CONFIRMED,
            check_in=today,
        ).count()
        today_check_outs = host_bookings.filter(
            status=Booking.BookingStatus.CONFIRMED,
            check_out=today,
        ).count()

        total_rooms = RoomType.objects.filter(hotel__host=user, is_active=True).aggregate(
            total=Sum('total_rooms')
        )['total'] or 0
        occupied_rooms = host_bookings.filter(
            status=Booking.BookingStatus.CONFIRMED,
            check_in__lte=today,
            check_out__gte=today,
            room_type__isnull=False,
        ).count()
        occupancy_rate = round((occupied_rooms / total_rooms) * 100) if total_rooms > 0 else 0

        reviews_qs = Review.objects.filter(
            Q(hotel__host=user) | Q(bnb_listing__host=user),
            is_public=True,
        )
        if date_from_value:
            reviews_qs = reviews_qs.filter(created_at__date__gte=date_from_value)
        if date_to_value:
            reviews_qs = reviews_qs.filter(created_at__date__lte=date_to_value)
        total_reviews = reviews_qs.count()
        average_rating = float(reviews_qs.aggregate(avg=Avg('rating'))['avg'] or 0)

        stats = {
            'total_bookings': total_bookings,
            'pending_bookings': pending_bookings,
            'pending_requests': pending_bookings,
            'total_revenue': round(total_revenue, 2),
            'average_rating': round(average_rating, 2),
            'total_reviews': total_reviews,
            'occupancy_rate': occupancy_rate,
            'total_rooms': total_rooms,
            'available_rooms': max(total_rooms - occupied_rooms, 0),
            'today_check_ins': today_check_ins,
            'today_check_outs': today_check_outs,
            'total_hotels': Hotel.objects.filter(host=user, is_active=True).count(),
            'active_hotels': Hotel.objects.filter(host=user, is_active=True, is_verified=True).count(),
            'total_bnb_listings': BnBListing.objects.filter(host=user, is_active=True).count(),
            'active_bnb_listings': BnBListing.objects.filter(host=user, is_active=True, is_verified=True).count(),
            'host_type': user.host_type,
            'verification_status': user.host_verification_status,
            'date_from': str(date_from_value) if date_from_value else None,
            'date_to': str(date_to_value) if date_to_value else None,
            'range': selected_range or 'custom',
        }

        return Response(stats)


class HostDashboardSummaryView(HostDashboardView):
    """
    Backward-compatible alias for host dashboard summary endpoint.
    """
