from django.conf import settings
from django.contrib.auth import authenticate
from django.core.mail import EmailMultiAlternatives
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.bookings.models import Booking
from apps.listings.models import BnBListing, Hotel
from apps.payments.models import Payment, PaymentIntent, PaymentWebhookEvent
from apps.promotions.models import Promotion
from apps.reviews.models import Review
from apps.users.models import User
from apps.users.services.otp import EmailOTPSender, check_code, generate_and_assign_code

from .audit import log_admin_action
from .models import AdminActionLog
from .permissions import IsAnyAdmin, IsManagerialOrSystemAdmin, IsSystemAdmin
from .serializers import (
    AdminActionLogSerializer,
    AdminBnBListingSerializer,
    AdminBookingSerializer,
    AdminHotelSerializer,
    AdminLoginStep1Serializer,
    AdminLoginStep2Serializer,
    AdminPaymentIntentSerializer,
    AdminPaymentSerializer,
    AdminPaymentWebhookEventSerializer,
    AdminPromotionSerializer,
    AdminReviewSerializer,
    AdminSelfSerializer,
    AdminUserDetailSerializer,
    AdminUserLookupSerializer,
)

GENERIC_LOGIN_ERROR = {'error': 'Invalid credentials.'}
GENERIC_OTP_ERROR = {'error': 'Invalid or expired verification code.'}


class AdminLoginStep1View(APIView):
    """
    Step 1 of admin login: email+password. On success, emails an OTP and
    does NOT issue JWTs yet -- those only come from step 2. Deliberately
    returns the same generic error whether the email doesn't exist, the
    password is wrong, or the account just isn't an admin.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'admin_login'

    def post(self, request):
        serializer = AdminLoginStep1Serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        password = serializer.validated_data['password']

        user = authenticate(username=email, password=password)
        if not user:
            account = User.objects.filter(email__iexact=email).first()
            if account:
                user = authenticate(username=account.username, password=password)

        if not user or not user.is_active or not user.admin_tier:
            return Response(GENERIC_LOGIN_ERROR, status=status.HTTP_400_BAD_REQUEST)

        code = generate_and_assign_code(user)
        try:
            EmailOTPSender().send(user, code)
        except Exception:
            return Response(
                {'error': 'Could not send verification code. Try again shortly.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response({'message': 'Verification code sent.', 'email': user.email}, status=status.HTTP_200_OK)


class AdminLoginStep2View(APIView):
    """
    Step 2: email+OTP code. Reuses the same verification_code_* fields the
    signup flow uses, but never touches account_verified/email_verified --
    those mean "completed signup," a different concept from this login MFA
    step. Issues JWTs on success.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'admin_login'

    def post(self, request):
        serializer = AdminLoginStep2Serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        code = serializer.validated_data['code']

        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if not user or not user.admin_tier or not user.verification_code_hash:
            return Response(GENERIC_OTP_ERROR, status=status.HTTP_400_BAD_REQUEST)

        if user.verification_code_attempts >= settings.OTP_MAX_ATTEMPTS:
            return Response(
                {'error': 'Too many incorrect attempts. Log in again to request a new code.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.verification_code_expires or user.verification_code_expires < timezone.now():
            return Response(GENERIC_OTP_ERROR, status=status.HTTP_400_BAD_REQUEST)

        if not check_code(user, code):
            user.verification_code_attempts += 1
            user.save(update_fields=['verification_code_attempts'])
            return Response(GENERIC_OTP_ERROR, status=status.HTTP_400_BAD_REQUEST)

        user.verification_code_hash = None
        user.verification_code_expires = None
        user.verification_code_attempts = 0
        user.last_login = timezone.now()
        user.save(update_fields=[
            'verification_code_hash', 'verification_code_expires',
            'verification_code_attempts', 'last_login',
        ])

        refresh = RefreshToken.for_user(user)
        AdminActionLog.objects.create(
            actor=user,
            actor_tier=user.admin_tier,
            action='admin.login',
            target_model='users.User',
            target_id=str(user.pk),
            ip_address=request.META.get('REMOTE_ADDR'),
        )

        return Response({
            'message': 'Login successful',
            'user': AdminSelfSerializer(user).data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }
        }, status=status.HTTP_200_OK)


class AdminMeView(APIView):
    """Who-am-I for the admin frontend, after it has a JWT from step 2."""
    permission_classes = [IsAnyAdmin]

    def get(self, request):
        return Response(AdminSelfSerializer(request.user).data)


class AdminUserSerializerMixin:
    """Tier-based serializer swap: Support gets the trimmed lookup view,
    System/Managerial get the broad detail view -- same pattern every later
    module reuses."""

    def get_serializer_class(self):
        if self.request.user.admin_tier == User.AdminTier.SUPPORT:
            return AdminUserLookupSerializer
        return AdminUserDetailSerializer


class AdminUserListView(AdminUserSerializerMixin, generics.ListAPIView):
    queryset = User.objects.all().order_by('-created_at')
    permission_classes = [IsAnyAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['user_type', 'is_verified', 'is_active']
    search_fields = ['email', 'first_name', 'last_name', 'phone_number']
    ordering_fields = ['created_at', 'email', 'last_login']


class AdminUserDetailView(AdminUserSerializerMixin, generics.RetrieveAPIView):
    queryset = User.objects.all()
    permission_classes = [IsAnyAdmin]


class AdminUserSuspendView(APIView):
    """Support tier never reaches this -- IsManagerialOrSystemAdmin only."""
    permission_classes = [IsManagerialOrSystemAdmin]

    def post(self, request, pk):
        target = get_object_or_404(User.objects.all(), pk=pk)
        if target.pk == request.user.pk:
            # JWTAuthentication rejects an inactive user's own token on its
            # very next request -- suspending yourself locks you out mid-session.
            return Response({'error': 'You cannot suspend your own account.'}, status=status.HTTP_400_BAD_REQUEST)
        target.is_active = False
        target.save(update_fields=['is_active'])
        log_admin_action(request, action='user.suspend', target=target)
        return Response(AdminUserDetailSerializer(target).data)


class AdminUserActivateView(APIView):
    permission_classes = [IsManagerialOrSystemAdmin]

    def post(self, request, pk):
        target = get_object_or_404(User.objects.all(), pk=pk)
        target.is_active = True
        target.save(update_fields=['is_active'])
        log_admin_action(request, action='user.activate', target=target)
        return Response(AdminUserDetailSerializer(target).data)


ADMIN_BOOKING_QUERYSET = Booking.objects.select_related('traveler', 'hotel', 'bnb_listing').order_by('-created_at')


class AdminBookingListView(generics.ListAPIView):
    queryset = ADMIN_BOOKING_QUERYSET
    serializer_class = AdminBookingSerializer
    permission_classes = [IsAnyAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'payment_status', 'host_approval_status']
    search_fields = ['guest_full_name', 'guest_email', 'traveler__email']
    ordering_fields = ['created_at', 'check_in', 'total_amount']


class AdminBookingDetailView(generics.RetrieveAPIView):
    queryset = ADMIN_BOOKING_QUERYSET
    serializer_class = AdminBookingSerializer
    permission_classes = [IsAnyAdmin]


class AdminBookingMessageGuestView(APIView):
    """
    One-off email to the guest, not inserted into the in-app message thread
    -- apps.messaging.Message hardcodes exactly 2 participants (booking
    traveler + host), so an admin can't cleanly post into that thread
    without changing that model. See ADR note in the super-admin plan for
    why that's deferred rather than done here.
    """
    permission_classes = [IsAnyAdmin]

    def post(self, request, pk):
        booking = get_object_or_404(Booking.objects.all(), pk=pk)
        message = (request.data.get('message') or '').strip()
        if not message:
            return Response({'error': 'message is required.'}, status=status.HTTP_400_BAD_REQUEST)

        email = EmailMultiAlternatives(
            subject=f'A message about your Msafiri Space booking #{booking.pk}',
            body=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[booking.guest_email],
        )
        try:
            email.send(fail_silently=False)
        except Exception:
            return Response({'error': 'Could not send the message. Try again shortly.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        log_admin_action(request, action='booking.message_guest', target=booking, note=message[:500])
        return Response({'message': 'Sent.'})


QUEUE_LIMIT = 30


class NeedsAttentionView(APIView):
    """
    The admin home-view action queue: one flat list of everything that
    genuinely needs a human decision, sorted by urgency then by how long
    it's been waiting. Built entirely from real fields -- no fabricated
    "needs attention" state invented for models that don't have one
    (reviews/promotions have no flagging mechanism, so they're not here).
    Tier-filtered: Support sees bookings only (listing verification is
    Managerial's job, not theirs).
    """
    permission_classes = [IsAnyAdmin]

    def get(self, request):
        now = timezone.now()
        is_support = request.user.admin_tier == User.AdminTier.SUPPORT

        def property_name(booking):
            if booking.hotel_id:
                return booking.hotel.name
            if booking.bnb_listing_id:
                return booking.bnb_listing.title
            return None

        def booking_urgency(hold_expires_at):
            # A hold about to lapse is a different, more time-pressured kind
            # of "waiting" than a listing that's been sitting unverified --
            # tiered by hours left, not days waited.
            if not hold_expires_at or hold_expires_at < now:
                return 'normal'
            hours_left = (hold_expires_at - now).total_seconds() / 3600
            if hours_left <= 6:
                return 'critical'
            if hours_left <= 24:
                return 'warning'
            return 'normal'

        def listing_urgency(created_at):
            days_waiting = (now - created_at).days
            if days_waiting >= 30:
                return 'critical'
            if days_waiting >= 14:
                return 'warning'
            return 'normal'

        buckets = {'critical': [], 'warning': [], 'normal': []}

        pending_bookings = Booking.objects.filter(
            host_approval_status=Booking.HostApprovalStatus.PENDING
        ).select_related('hotel', 'bnb_listing')

        for b in pending_bookings:
            urgency = booking_urgency(b.hold_expires_at)
            row = {
                'type': 'booking',
                'id': b.pk,
                'urgency': urgency,
                'guest_name': b.guest_full_name,
                'title': f'{b.guest_full_name} — {property_name(b) or "a listing"}',
                'subtitle': (
                    f'Hold expires in {max(0, round((b.hold_expires_at - now).total_seconds() / 3600))}h'
                    if urgency in ('critical', 'warning') else 'Awaiting host approval'
                ),
                'waiting_since': b.created_at,
                'action_label': 'View',
                'action_to': '/admin/bookings',
            }
            sort_key = b.hold_expires_at if urgency in ('critical', 'warning') and b.hold_expires_at else b.created_at
            buckets[urgency].append((sort_key, row))

        if not is_support:
            for h in Hotel.objects.filter(is_verified=False).select_related('host'):
                urgency = listing_urgency(h.created_at)
                buckets[urgency].append((h.created_at, {
                    'type': 'hotel',
                    'id': h.pk,
                    'urgency': urgency,
                    'title': h.name,
                    'subtitle': f'{h.host.email} · {h.city}, {h.country}',
                    'waiting_since': h.created_at,
                    'quick_action': 'verify_hotel',
                }))
            for bnb in BnBListing.objects.filter(is_verified=False).select_related('host'):
                urgency = listing_urgency(bnb.created_at)
                buckets[urgency].append((bnb.created_at, {
                    'type': 'bnb',
                    'id': bnb.pk,
                    'urgency': urgency,
                    'title': bnb.title,
                    'subtitle': f'{bnb.host.email} · {bnb.city}, {bnb.country}',
                    'waiting_since': bnb.created_at,
                    'quick_action': 'verify_bnb',
                }))

        ordered = []
        for tier in ('critical', 'warning', 'normal'):
            buckets[tier].sort(key=lambda pair: pair[0])
            ordered.extend(row for _, row in buckets[tier])

        all_rows = [row for _, row in buckets['critical'] + buckets['warning'] + buckets['normal']]
        counts = {
            'bookings': sum(1 for row in all_rows if row['type'] == 'booking'),
            'listings': sum(1 for row in all_rows if row['type'] in ('hotel', 'bnb')),
            'critical': sum(1 for row in all_rows if row['urgency'] == 'critical'),
        }

        return Response({'items': ordered[:QUEUE_LIMIT], 'total_count': len(ordered), 'counts': counts})


LISTING_MODERATION_FIELDS = {'is_active', 'is_verified', 'is_featured'}

ADMIN_HOTEL_QUERYSET = Hotel.objects.select_related('host').order_by('-created_at')
ADMIN_BNB_QUERYSET = BnBListing.objects.select_related('host').order_by('-created_at')


class AdminHotelListView(generics.ListAPIView):
    queryset = ADMIN_HOTEL_QUERYSET
    serializer_class = AdminHotelSerializer
    permission_classes = [IsManagerialOrSystemAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'is_verified', 'is_featured']
    search_fields = ['name', 'city', 'country', 'host__email']
    ordering_fields = ['created_at', 'name']


class AdminHotelDetailView(generics.RetrieveAPIView):
    queryset = ADMIN_HOTEL_QUERYSET
    serializer_class = AdminHotelSerializer
    permission_classes = [IsManagerialOrSystemAdmin]


class AdminHotelModerateView(APIView):
    """One endpoint for the 3 boolean moderation toggles rather than 6
    near-identical action views -- each call is still individually audited
    with the specific field/value that changed."""
    permission_classes = [IsManagerialOrSystemAdmin]

    def post(self, request, pk):
        target = get_object_or_404(Hotel.objects.all(), pk=pk)
        field = request.data.get('field')
        value = request.data.get('value')
        if field not in LISTING_MODERATION_FIELDS or not isinstance(value, bool):
            return Response(
                {'error': 'field must be one of is_active/is_verified/is_featured, value must be a boolean.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        setattr(target, field, value)
        target.save(update_fields=[field])
        log_admin_action(request, action=f'hotel.{field}', target=target, changes={'after': {field: value}})
        return Response(AdminHotelSerializer(target).data)


class AdminBnBListingListView(generics.ListAPIView):
    queryset = ADMIN_BNB_QUERYSET
    serializer_class = AdminBnBListingSerializer
    permission_classes = [IsManagerialOrSystemAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'is_verified', 'is_featured']
    search_fields = ['title', 'city', 'country', 'host__email']
    ordering_fields = ['created_at', 'title']


class AdminBnBListingDetailView(generics.RetrieveAPIView):
    queryset = ADMIN_BNB_QUERYSET
    serializer_class = AdminBnBListingSerializer
    permission_classes = [IsManagerialOrSystemAdmin]


class AdminBnBListingModerateView(APIView):
    permission_classes = [IsManagerialOrSystemAdmin]

    def post(self, request, pk):
        target = get_object_or_404(BnBListing.objects.all(), pk=pk)
        field = request.data.get('field')
        value = request.data.get('value')
        if field not in LISTING_MODERATION_FIELDS or not isinstance(value, bool):
            return Response(
                {'error': 'field must be one of is_active/is_verified/is_featured, value must be a boolean.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        setattr(target, field, value)
        target.save(update_fields=[field])
        log_admin_action(request, action=f'bnb_listing.{field}', target=target, changes={'after': {field: value}})
        return Response(AdminBnBListingSerializer(target).data)


ADMIN_PROMOTION_QUERYSET = Promotion.objects.select_related('provider', 'hotel').order_by('-created_at')


class AdminPromotionListView(generics.ListAPIView):
    queryset = ADMIN_PROMOTION_QUERYSET
    serializer_class = AdminPromotionSerializer
    permission_classes = [IsManagerialOrSystemAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'promotion_type']
    search_fields = ['title', 'hotel__name', 'provider__email']
    ordering_fields = ['created_at', 'views_count', 'bookings_count']


class AdminPromotionDetailView(generics.RetrieveAPIView):
    queryset = ADMIN_PROMOTION_QUERYSET
    serializer_class = AdminPromotionSerializer
    permission_classes = [IsManagerialOrSystemAdmin]


class AdminPromotionStatusView(APIView):
    permission_classes = [IsManagerialOrSystemAdmin]

    def post(self, request, pk):
        target = get_object_or_404(Promotion.objects.all(), pk=pk)
        new_status = request.data.get('status')
        if new_status not in Promotion.Status.values:
            return Response(
                {'error': f'status must be one of {list(Promotion.Status.values)}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        target.status = new_status
        target.save(update_fields=['status'])
        log_admin_action(request, action='promotion.status', target=target, changes={'after': {'status': new_status}})
        return Response(AdminPromotionSerializer(target).data)


ADMIN_REVIEW_QUERYSET = Review.objects.select_related('traveler', 'hotel', 'bnb_listing').order_by('-created_at')


class AdminReviewListView(generics.ListAPIView):
    queryset = ADMIN_REVIEW_QUERYSET
    serializer_class = AdminReviewSerializer
    permission_classes = [IsManagerialOrSystemAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_public', 'rating']
    search_fields = ['title', 'comment', 'traveler__email']
    ordering_fields = ['created_at', 'rating']


class AdminReviewDetailView(generics.RetrieveAPIView):
    queryset = ADMIN_REVIEW_QUERYSET
    serializer_class = AdminReviewSerializer
    permission_classes = [IsManagerialOrSystemAdmin]


class AdminReviewVisibilityView(APIView):
    permission_classes = [IsManagerialOrSystemAdmin]

    def post(self, request, pk):
        target = get_object_or_404(Review.objects.all(), pk=pk)
        value = request.data.get('is_public')
        if not isinstance(value, bool):
            return Response({'error': 'is_public must be a boolean.'}, status=status.HTTP_400_BAD_REQUEST)
        target.is_public = value
        target.save(update_fields=['is_public'])
        log_admin_action(request, action='review.is_public', target=target, changes={'after': {'is_public': value}})
        return Response(AdminReviewSerializer(target).data)


class AdminPaymentListView(generics.ListAPIView):
    queryset = Payment.objects.select_related('traveler').order_by('-created_at')
    serializer_class = AdminPaymentSerializer
    permission_classes = [IsManagerialOrSystemAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'gateway']
    search_fields = ['reference', 'provider_reference', 'traveler__email']
    ordering_fields = ['created_at', 'amount']


class AdminPaymentIntentListView(generics.ListAPIView):
    queryset = PaymentIntent.objects.select_related('traveler').order_by('-created_at')
    serializer_class = AdminPaymentIntentSerializer
    permission_classes = [IsManagerialOrSystemAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'gateway']
    search_fields = ['reference', 'traveler__email']
    ordering_fields = ['created_at', 'amount']


class AdminPaymentWebhookEventListView(generics.ListAPIView):
    queryset = PaymentWebhookEvent.objects.order_by('-created_at')
    serializer_class = AdminPaymentWebhookEventSerializer
    permission_classes = [IsManagerialOrSystemAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['provider', 'processed']
    search_fields = ['event_key', 'request_id']
    ordering_fields = ['created_at']


class AdminAdminsListView(generics.ListAPIView):
    """All current admin-tier users -- System only."""
    queryset = User.objects.filter(admin_tier__isnull=False).order_by('-created_at')
    serializer_class = AdminUserDetailSerializer
    permission_classes = [IsSystemAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['admin_tier']
    search_fields = ['email', 'first_name', 'last_name']
    ordering_fields = ['created_at', 'email']


class AdminGrantView(APIView):
    """
    Promote an existing platform user to an admin tier. Deliberately
    requires the account to already exist (sign up normally first) --
    inventing a password-delivery mechanism for brand-new accounts is out
    of scope; bootstrap_admin (shell access) covers the from-scratch case
    for the very first System admin.
    """
    permission_classes = [IsSystemAdmin]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        tier = request.data.get('tier')
        if not email or tier not in User.AdminTier.values:
            return Response(
                {'error': f'email is required and tier must be one of {list(User.AdminTier.values)}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response(
                {'error': f'No account found for {email}. They need to sign up on the platform first.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        user.admin_tier = tier
        user.admin_tier_granted_by = request.user
        user.save(update_fields=['admin_tier', 'admin_tier_granted_by'])
        log_admin_action(request, action='admin.grant', target=user, changes={'after': {'admin_tier': tier}})
        return Response(AdminUserDetailSerializer(user).data)


class AdminRevokeView(APIView):
    permission_classes = [IsSystemAdmin]

    def post(self, request, pk):
        target = get_object_or_404(User.objects.all(), pk=pk)
        if target.pk == request.user.pk:
            return Response({'error': 'You cannot revoke your own admin access.'}, status=status.HTTP_400_BAD_REQUEST)
        previous_tier = target.admin_tier
        target.admin_tier = None
        target.admin_tier_granted_by = None
        target.save(update_fields=['admin_tier', 'admin_tier_granted_by'])
        log_admin_action(request, action='admin.revoke', target=target, changes={'before': {'admin_tier': previous_tier}})
        return Response({'message': 'Admin access revoked.'})


class AdminActionLogListView(generics.ListAPIView):
    queryset = AdminActionLog.objects.select_related('actor').all()
    serializer_class = AdminActionLogSerializer
    permission_classes = [IsSystemAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['action', 'actor_tier', 'target_model']
    search_fields = ['target_id', 'note', 'actor__email']
    ordering_fields = ['created_at']
