"""
Views for the Users app
"""
from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.db import transaction
import secrets
import string

from .serializers import (
    UserRegistrationSerializer, UserLoginSerializer, UserProfileSerializer,
    UserUpdateSerializer, UserAddressSerializer, UserDetailSerializer,
    PasswordChangeSerializer, PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer, EmailVerificationSerializer,
    ReferralSerializer, UserStatsSerializer,
    AddRoleSerializer, SwitchRoleSerializer,
    HotelRestaurantHostProfileSerializer, BnBHostProfileSerializer,
    ConciergeHostProfileSerializer, HostOnboardingSerializer
)
from .models import User, UserProfile, UserAddress

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
                    
                    # Generate email verification token
                    token = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
                    user.email_verification_token = token
                    user.save()
                    
                    # Send verification email (in production, use Celery task)
                    if settings.EMAIL_BACKEND != 'django.core.mail.backends.console.EmailBackend':
                        send_mail(
                            'Verify your email - Msafiri Space',
                            f'Click here to verify your email: {settings.SITE_URL}/verify-email/{token}',
                            settings.DEFAULT_FROM_EMAIL,
                            [user.email],
                            fail_silently=True,
                        )
                    
                    # Generate JWT tokens
                    refresh = RefreshToken.for_user(user)
                    
                    return Response({
                        'message': 'User registered successfully. Please check your email for verification.',
                        'user': {
                            'id': user.id,
                            'email': user.email,
                            'first_name': user.first_name,
                            'last_name': user.last_name,
                            'active_role': user.active_role,
                            'roles': user.roles,
                            'is_verified': user.is_verified,
                        },
                        'tokens': {
                            'access': str(refresh.access_token),
                            'refresh': str(refresh),
                        }
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
    
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            
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
    permission_classes = [permissions.IsAuthenticated]
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
            user = User.objects.get(email=email)
            
            # Generate reset token
            token = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
            user.password_reset_token = token
            user.password_reset_expires = timezone.now() + timezone.timedelta(hours=24)
            user.save()
            
            # Send reset email (in production, use Celery task)
            if settings.EMAIL_BACKEND != 'django.core.mail.backends.console.EmailBackend':
                send_mail(
                    'Password Reset - Msafiri Space',
                    f'Click here to reset your password: {settings.SITE_URL}/reset-password/{token}',
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=True,
                )
            
            return Response({
                'message': 'Password reset email sent. Please check your email.'
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


class EmailVerificationView(APIView):
    """
    Email verification endpoint
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = EmailVerificationSerializer(data=request.data)
        if serializer.is_valid():
            token = serializer.validated_data['token']
            
            try:
                user = User.objects.get(
                    email_verification_token=token,
                    is_active=True
                )
                
                # Verify email
                user.email_verified = True
                user.email_verification_token = None
                user.save()
                
                return Response({
                    'message': 'Email verified successfully'
                }, status=status.HTTP_200_OK)
                
            except User.DoesNotExist:
                return Response({
                    'error': 'Invalid verification token'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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


class UserStatsView(APIView):
    """
    User statistics endpoint
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # This would typically fetch data from other apps
        # For now, returning mock data
        stats = {
            'total_bookings': 0,  # Would come from bookings app
            'total_reviews': 0,   # Would come from reviews app
            'average_rating': 0.00,
            'total_spent': 0.00,  # Would come from payments app
            'favorite_destinations': [],
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
    
    dashboard_data = {
        'user': UserDetailSerializer(user).data,
        'quick_stats': {
            'total_bookings': 0,
            'pending_bookings': 0,
            'total_reviews': 0,
            'average_rating': 0.00,
        },
        'recent_activity': [],
        'upcoming_trips': [],
        'recommendations': [],
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


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def resend_verification_email(request):
    """
    Resend email verification endpoint
    """
    user = request.user
    
    if user.email_verified:
        return Response({
            'error': 'Email is already verified'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Generate new verification token
    token = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
    user.email_verification_token = token
    user.save()
    
    # Send verification email (in production, use Celery task)
    if settings.EMAIL_BACKEND != 'django.core.mail.backends.console.EmailBackend':
        send_mail(
            'Verify your email - Msafiri Space',
            f'Click here to verify your email: {settings.SITE_URL}/verify-email/{token}',
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=True,
        )
    
    return Response({
        'message': 'Verification email sent. Please check your email.'
    }, status=status.HTTP_200_OK)


class HostOnboardingView(APIView):
    """
    Host onboarding endpoint for different host types
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """
        Create host profile based on host type
        """
        print(f"Received data: {request.data}")
        serializer = HostOnboardingSerializer(data=request.data, context={'user': request.user})
        print(f"Serializer is valid: {serializer.is_valid()}")
        if not serializer.is_valid():
            print(f"Serializer errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            with transaction.atomic():
                # Update user type and host type
                user = request.user
                user.user_type = User.UserType.HOST
                user.host_type = serializer.validated_data['host_type']
                user.save()
                
                # Create specific host profile
                host_profile = serializer.save(user=user)
                
                return Response({
                    'message': 'Host profile created successfully',
                    'host_profile': serializer.data
                }, status=status.HTTP_201_CREATED)
        except Exception as e:
            print(f"Error creating host profile: {str(e)}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


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


class ConciergeHostProfileView(APIView):
    """
    Concierge host profile management
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get concierge host profile"""
        try:
            profile = request.user.concierge_profile
            serializer = ConciergeHostProfileSerializer(profile)
            return Response(serializer.data)
        except:
            return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)
    
    def put(self, request):
        """Update concierge host profile"""
        try:
            profile = request.user.concierge_profile
            serializer = ConciergeHostProfileSerializer(profile, data=request.data, partial=True)
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
        
        # Check if user is a host
        if not user.is_host:
            return Response({'error': 'User is not a host'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get basic stats (these would be calculated from actual data in production)
        stats = {
            'total_bookings': 0,
            'total_revenue': 0,
            'average_rating': 0,
            'total_reviews': 0,
            'occupancy_rate': 0,
            'pending_requests': 0,
            'host_type': user.host_type,
            'verification_status': user.host_verification_status
        }
        
        return Response(stats)
