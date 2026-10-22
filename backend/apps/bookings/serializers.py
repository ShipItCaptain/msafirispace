"""
Serializers for bookings app
"""
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework import serializers

from .models import Booking, BookingItem
from apps.listings.serializers import RoomTypeListSerializer, BnBListingSerializer
from apps.listings.models import Hotel, RoomType, BnBListing, BnBAvailability, RoomAvailability


def _exclude_expired_holds(queryset, path=''):
    """
    A pending booking whose hold has lapsed no longer reserves its dates --
    checked here, lazily, rather than by a background job flipping its
    status (see BOOKING_HOLD_MINUTES in settings.py). `path` lets this
    filter a queryset of a related model (e.g. BookingItem) by its
    `booking__` relation instead of the fields directly.
    """
    return queryset.exclude(
        Q(**{f'{path}host_approval_status': Booking.HostApprovalStatus.PENDING})
        & Q(**{f'{path}hold_expires_at__lt': timezone.now()})
    )


class BookingItemSerializer(serializers.ModelSerializer):
    room_type_id = serializers.IntegerField(source='room_type.id', read_only=True)
    room_type_name = serializers.CharField(source='room_type.name', read_only=True)

    class Meta:
        model = BookingItem
        fields = ['id', 'room_type_id', 'room_type_name', 'quantity', 'nightly_price', 'subtotal']


class BookingSerializer(serializers.ModelSerializer):
    traveler = serializers.PrimaryKeyRelatedField(read_only=True)
    hotel = serializers.PrimaryKeyRelatedField(read_only=True, allow_null=True)
    room_type_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    room_type = RoomTypeListSerializer(read_only=True, allow_null=True)
    bnb_listing_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    bnb_listing = BnBListingSerializer(read_only=True, allow_null=True)
    is_hold_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'traveler', 'hotel', 'room_type', 'room_type_id',
            'bnb_listing', 'bnb_listing_id',
            'check_in', 'check_out', 'num_adults', 'num_children',
            'special_requests', 'nightly_price', 'currency', 'total_nights',
            'cleaning_fee', 'total_amount', 'deposit_amount', 'status', 'host_approval_status',
            'calendar_verified', 'hold_expires_at', 'is_hold_expired',
            'payment_method', 'payment_status', 'guest_full_name', 'guest_email',
            'guest_phone', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'traveler', 'hotel', 'nightly_price', 'currency', 'total_nights',
            'cleaning_fee', 'total_amount', 'deposit_amount', 'status', 'host_approval_status',
            'calendar_verified', 'hold_expires_at',
            'payment_status', 'created_at', 'updated_at'
        ]

    def validate(self, attrs):
        """Validate that either room_type_id or bnb_listing_id is provided"""
        room_type_id = attrs.get('room_type_id')
        bnb_listing_id = attrs.get('bnb_listing_id')
        instance = getattr(self, 'instance', None)

        if instance:
            if room_type_id is None and instance.room_type_id:
                room_type_id = instance.room_type_id
            if bnb_listing_id is None and instance.bnb_listing_id:
                bnb_listing_id = instance.bnb_listing_id
        
        if not room_type_id and not bnb_listing_id:
            raise serializers.ValidationError(
                "Either room_type_id (for hotel bookings) or bnb_listing_id (for BnB bookings) must be provided."
            )
        
        if room_type_id and bnb_listing_id:
            raise serializers.ValidationError(
                "Cannot specify both room_type_id and bnb_listing_id. Please choose one."
            )

        check_in = attrs.get('check_in', instance.check_in if instance else None)
        check_out = attrs.get('check_out', instance.check_out if instance else None)
        if check_in and check_out and check_in >= check_out:
            raise serializers.ValidationError({'check_out': 'check_out must be after check_in'})

        if room_type_id:
            try:
                attrs['_resolved_room_type'] = RoomType.objects.select_related('hotel').get(pk=room_type_id)
            except RoomType.DoesNotExist as exc:
                raise serializers.ValidationError({'room_type_id': 'Selected room type does not exist.'}) from exc

            room_type = attrs['_resolved_room_type']
            if not room_type.is_active or not room_type.is_available:
                raise serializers.ValidationError({
                    'room_type_id': 'This room type is currently unavailable.'
                })

            num_adults = attrs.get('num_adults', instance.num_adults if instance else 1)
            num_children = attrs.get('num_children', instance.num_children if instance else 0)
            total_guests = (num_adults or 0) + (num_children or 0)

            if num_adults > room_type.max_adults:
                raise serializers.ValidationError({
                    'num_adults': f'This room allows a maximum of {room_type.max_adults} adult(s).'
                })
            if num_children > room_type.max_children:
                raise serializers.ValidationError({
                    'num_children': f'This room allows a maximum of {room_type.max_children} child(ren).'
                })
            if total_guests > room_type.max_occupancy:
                raise serializers.ValidationError({
                    'num_adults': f'This room allows a maximum of {room_type.max_occupancy} guest(s).'
                })

            if check_in and check_out:
                attrs['_hotel_availability'] = self._validate_hotel_availability(
                    room_type=room_type,
                    check_in=check_in,
                    check_out=check_out,
                    instance=instance,
                )

        if bnb_listing_id:
            try:
                bnb_listing = BnBListing.objects.get(pk=bnb_listing_id)
            except BnBListing.DoesNotExist as exc:
                raise serializers.ValidationError({'bnb_listing_id': 'Selected BnB listing does not exist.'}) from exc

            if not bnb_listing.is_active:
                raise serializers.ValidationError({'bnb_listing_id': 'This BnB listing is currently unavailable.'})

            attrs['_resolved_bnb_listing'] = bnb_listing

            # Additional booking constraints apply to BnB bookings.
            if check_in and check_out:
                total_nights = (check_out - check_in).days
                if total_nights < bnb_listing.minimum_nights:
                    raise serializers.ValidationError({
                        'check_out': f'Minimum stay is {bnb_listing.minimum_nights} night(s) for this listing.'
                    })
                if total_nights > bnb_listing.maximum_nights:
                    raise serializers.ValidationError({
                        'check_out': f'Maximum stay is {bnb_listing.maximum_nights} night(s) for this listing.'
                    })

                num_adults = attrs.get('num_adults', instance.num_adults if instance else 1)
                num_children = attrs.get('num_children', instance.num_children if instance else 0)
                requested_guests = (num_adults or 0) + (num_children or 0)
                if requested_guests > bnb_listing.max_guests:
                    raise serializers.ValidationError({
                        'num_adults': f'This listing allows a maximum of {bnb_listing.max_guests} guest(s).'
                    })

                overlap_qs = Booking.objects.filter(
                    bnb_listing=bnb_listing
                ).exclude(
                    status=Booking.BookingStatus.CANCELLED
                ).filter(
                    check_in__lt=check_out,
                    check_out__gt=check_in,
                )
                if instance:
                    overlap_qs = overlap_qs.exclude(pk=instance.pk)
                overlap_qs = _exclude_expired_holds(overlap_qs)
                if overlap_qs.exists():
                    raise serializers.ValidationError({
                        'check_in': 'These dates are already booked for this listing.'
                    })

                availability_rows_in_range = BnBAvailability.objects.filter(
                    bnb_listing=bnb_listing,
                    date__gte=check_in,
                    date__lt=check_out,
                )
                nights = (check_out - check_in).days
                # Verified only if the host's calendar has an explicit row for
                # every night of the stay -- a partial calendar is as good as
                # no calendar for deciding whether we can trust it blind.
                attrs['_bnb_calendar_verified'] = availability_rows_in_range.count() >= nights

                blocked_day = (
                    availability_rows_in_range
                    .exclude(status=BnBAvailability.AvailabilityStatus.AVAILABLE)
                    .order_by('date')
                    .first()
                )
                if blocked_day:
                    status = blocked_day.status
                    day = blocked_day.date.isoformat()
                    if status == BnBAvailability.AvailabilityStatus.OCCUPIED:
                        human = f'Those dates aren’t available — already booked for {day}.'
                    elif status == BnBAvailability.AvailabilityStatus.MAINTENANCE:
                        human = f'Those dates aren’t available — the listing is under maintenance on {day}.'
                    elif status == BnBAvailability.AvailabilityStatus.OUT_OF_ORDER:
                        human = f'Those dates aren’t available — the listing is out of order on {day}.'
                    else:
                        human = f'Those dates aren’t available for {day}. Please try different dates.'
                    raise serializers.ValidationError({'check_in': human})
        
        return attrs

    def _validate_hotel_availability(self, *, room_type, check_in, check_out, instance=None):
        stay_dates = []
        current_date = check_in
        while current_date < check_out:
            stay_dates.append(current_date)
            current_date += timedelta(days=1)

        overlapping_bookings = Booking.objects.filter(
            room_type=room_type,
        ).exclude(
            status=Booking.BookingStatus.CANCELLED,
        ).filter(
            check_in__lt=check_out,
            check_out__gt=check_in,
        )
        if instance:
            overlapping_bookings = overlapping_bookings.exclude(pk=instance.pk)
        overlapping_bookings = _exclude_expired_holds(overlapping_bookings)
        overlapping_count = overlapping_bookings.count()

        availability_rows = {
            row.date: row
            for row in RoomAvailability.objects.filter(
                room_type=room_type,
                date__gte=check_in,
                date__lt=check_out,
            )
        }

        if not availability_rows:
            return {'mode': 'room_type_only'}

        for stay_date in stay_dates:
            availability = availability_rows.get(stay_date)
            if availability is None:
                continue
            if availability.status != RoomAvailability.AvailabilityStatus.AVAILABLE:
                raise serializers.ValidationError({
                    'check_in': f'No vacancy for {room_type.name} on {stay_date}.'
                })
            if availability.available_rooms <= overlapping_count:
                raise serializers.ValidationError({
                    'check_in': f'No vacancy for {room_type.name} on {stay_date}.'
                })

        return {
            'mode': 'daily_availability',
            'overlapping_count': overlapping_count,
        }

    def create(self, validated_data):
        room_type_id = validated_data.pop('room_type_id', None)
        bnb_listing_id = validated_data.pop('bnb_listing_id', None)
        room_type = validated_data.pop('_resolved_room_type', None)
        bnb_listing = validated_data.pop('_resolved_bnb_listing', None)
        hotel_availability = validated_data.pop('_hotel_availability', None)
        bnb_calendar_verified = validated_data.pop('_bnb_calendar_verified', None)

        if room_type_id:
            # Hotel booking
            room_type = room_type or RoomType.objects.select_related('hotel').get(pk=room_type_id)
            validated_data['room_type'] = room_type
            validated_data['hotel'] = room_type.hotel
            # Set pricing from room type
            if 'nightly_price' not in validated_data:
                validated_data['nightly_price'] = room_type.base_price
            if 'currency' not in validated_data:
                validated_data['currency'] = room_type.currency
            # 'room_type_only' mode means no RoomAvailability rows existed at
            # all for these dates -- nothing to trust, so treat as unverified.
            calendar_verified = bool(hotel_availability) and hotel_availability.get('mode') == 'daily_availability'
        elif bnb_listing_id:
            # BnB booking
            bnb_listing = bnb_listing or BnBListing.objects.get(pk=bnb_listing_id)
            validated_data['bnb_listing'] = bnb_listing
            # Set pricing from BnB listing
            if 'nightly_price' not in validated_data:
                validated_data['nightly_price'] = bnb_listing.price_per_night
            if 'currency' not in validated_data:
                validated_data['currency'] = bnb_listing.currency or 'KES'
            if 'cleaning_fee' not in validated_data:
                validated_data['cleaning_fee'] = bnb_listing.cleaning_fee
            if 'deposit_amount' not in validated_data:
                validated_data['deposit_amount'] = bnb_listing.security_deposit
            calendar_verified = bool(bnb_calendar_verified)
        else:
            calendar_verified = True

        # Calculate total nights and amount
        check_in = validated_data['check_in']
        check_out = validated_data['check_out']
        total_nights = (check_out - check_in).days
        validated_data['total_nights'] = total_nights

        validated_data['calendar_verified'] = calendar_verified
        hold_window = (
            timedelta(minutes=settings.BOOKING_HOLD_MINUTES) if calendar_verified
            else timedelta(hours=settings.BOOKING_HOST_RESPONSE_SLA_HOURS)
        )
        validated_data['hold_expires_at'] = timezone.now() + hold_window

        if 'total_amount' not in validated_data:
            nightly_price = validated_data.get('nightly_price', 0)
            cleaning_fee = validated_data.get('cleaning_fee', 0)
            validated_data['total_amount'] = (nightly_price * total_nights) + cleaning_fee

        payment_method = validated_data.get('payment_method', Booking.PaymentMethod.PAY_AT_PREMISES)
        if payment_method == Booking.PaymentMethod.ONLINE:
            validated_data['payment_status'] = Booking.PaymentStatus.PENDING
        else:
            validated_data['payment_status'] = Booking.PaymentStatus.UNPAID
        
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('room_type_id', None)
        validated_data.pop('bnb_listing_id', None)
        validated_data.pop('_resolved_room_type', None)
        validated_data.pop('_resolved_bnb_listing', None)
        validated_data.pop('_hotel_availability', None)
        validated_data.pop('_bnb_calendar_verified', None)

        payment_method = validated_data.get('payment_method')
        if payment_method and instance.payment_status != Booking.PaymentStatus.PAID:
            if payment_method == Booking.PaymentMethod.ONLINE:
                validated_data['payment_status'] = Booking.PaymentStatus.PENDING
            elif payment_method == Booking.PaymentMethod.PAY_AT_PREMISES:
                validated_data['payment_status'] = Booking.PaymentStatus.UNPAID

        return super().update(instance, validated_data)


class BookingListSerializer(serializers.ModelSerializer):
    room_type = RoomTypeListSerializer(read_only=True, allow_null=True)
    bnb_listing = BnBListingSerializer(read_only=True, allow_null=True)
    booking_type = serializers.SerializerMethodField()
    items = BookingItemSerializer(many=True, read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'check_in', 'check_out', 'total_nights', 'cleaning_fee', 'total_amount',
            'currency', 'status', 'host_approval_status', 'calendar_verified',
            'hold_expires_at', 'is_hold_expired', 'payment_status',
            'room_type', 'bnb_listing', 'booking_type', 'items', 'created_at'
        ]

    def get_booking_type(self, obj):
        """Return 'hotel' or 'bnb' based on booking type"""
        return 'hotel' if obj.hotel else 'bnb'


class BookingDetailSerializer(BookingSerializer):
    booking_type = serializers.SerializerMethodField()
    review = serializers.SerializerMethodField()
    items = BookingItemSerializer(many=True, read_only=True)

    class Meta(BookingSerializer.Meta):
        fields = BookingSerializer.Meta.fields + ['booking_type', 'review', 'items']

    def get_review(self, obj):
        review = getattr(obj, 'review', None)
        if not review:
            return None
        return {
            'id': review.id,
            'rating': review.rating,
            'title': review.title,
            'comment': review.comment,
            'created_at': review.created_at,
        }

    def get_booking_type(self, obj):
        """Return 'hotel' or 'bnb' based on booking type"""
        return 'hotel' if obj.hotel else 'bnb'


class HostBookingListSerializer(serializers.ModelSerializer):
    traveler_name = serializers.CharField(source='traveler.get_display_name', read_only=True)
    traveler_email = serializers.CharField(source='traveler.email', read_only=True)
    traveler_avatar = serializers.SerializerMethodField()
    hotel_id = serializers.IntegerField(source='hotel.id', read_only=True, allow_null=True)
    hotel_name = serializers.CharField(source='hotel.name', read_only=True, allow_null=True)
    room_name = serializers.SerializerMethodField()
    items = BookingItemSerializer(many=True, read_only=True)
    bnb_listing_id = serializers.IntegerField(source='bnb_listing.id', read_only=True, allow_null=True)
    bnb_listing_title = serializers.CharField(source='bnb_listing.title', read_only=True, allow_null=True)
    booking_type = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            'id', 'check_in', 'check_out', 'total_nights', 'cleaning_fee', 'total_amount', 'currency',
            'status', 'host_approval_status', 'calendar_verified', 'hold_expires_at',
            'is_hold_expired', 'payment_status', 'payment_method',
            'created_at', 'updated_at',
            'traveler_name', 'traveler_email', 'traveler_avatar',
            'guest_full_name', 'guest_email', 'guest_phone',
            'hotel_id', 'hotel_name', 'room_name', 'items',
            'bnb_listing_id', 'bnb_listing_title',
            'booking_type',
        ]

    def get_booking_type(self, obj):
        return 'hotel' if obj.hotel_id else 'bnb'

    def get_traveler_avatar(self, obj):
        picture = getattr(obj.traveler, 'profile_picture', None)
        if not picture:
            return None
        url = picture.url
        request = self.context.get('request')
        return request.build_absolute_uri(url) if request else url

    def get_room_name(self, obj):
        # Legacy single-room-type bookings have room_type set directly;
        # multi-room-type bookings carry their rooms in `items` instead.
        if obj.room_type_id:
            return obj.room_type.name
        items = list(obj.items.all())
        if items:
            return ', '.join(f'{item.quantity}x {item.room_type.name}' for item in items)
        return None


class MultiRoomBookingItemInputSerializer(serializers.Serializer):
    room_type_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


class MultiRoomBookingSerializer(serializers.Serializer):
    """
    Creates one Booking covering multiple room types with quantities in a
    single reservation (e.g. 2x Standard + 1x Family), via BookingItem rows.
    Deliberately separate from BookingSerializer, which is built around a
    single room_type_id and must keep working unchanged for the existing
    sidebar quick-book flow.
    """
    hotel_id = serializers.IntegerField()
    check_in = serializers.DateField()
    check_out = serializers.DateField()
    num_adults = serializers.IntegerField(min_value=1, default=1)
    num_children = serializers.IntegerField(min_value=0, default=0)
    special_requests = serializers.CharField(required=False, allow_blank=True, default='')
    guest_full_name = serializers.CharField(max_length=150)
    guest_email = serializers.EmailField()
    guest_phone = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    payment_method = serializers.ChoiceField(
        choices=Booking.PaymentMethod.choices, default=Booking.PaymentMethod.PAY_AT_PREMISES
    )
    items = MultiRoomBookingItemInputSerializer(many=True)

    def validate(self, attrs):
        check_in = attrs['check_in']
        check_out = attrs['check_out']
        if check_in >= check_out:
            raise serializers.ValidationError({'check_out': 'check_out must be after check_in'})

        items = attrs.get('items') or []
        if not items:
            raise serializers.ValidationError({'items': 'At least one room type with quantity must be selected.'})

        try:
            hotel = Hotel.objects.get(pk=attrs['hotel_id'])
        except Hotel.DoesNotExist as exc:
            raise serializers.ValidationError({'hotel_id': 'Selected hotel does not exist.'}) from exc
        attrs['_hotel'] = hotel

        # Merge duplicate room_type_ids in case the same row was somehow sent twice.
        merged_quantities = {}
        for item in items:
            room_type_id = item['room_type_id']
            merged_quantities[room_type_id] = merged_quantities.get(room_type_id, 0) + item['quantity']

        resolved_items = []
        total_adults_capacity = 0
        total_children_capacity = 0
        total_occupancy_capacity = 0
        for room_type_id, quantity in merged_quantities.items():
            try:
                room_type = RoomType.objects.select_related('hotel').get(pk=room_type_id)
            except RoomType.DoesNotExist as exc:
                raise serializers.ValidationError({'items': f'Room type {room_type_id} does not exist.'}) from exc
            if room_type.hotel_id != hotel.id:
                raise serializers.ValidationError({
                    'items': f'{room_type.name} does not belong to the selected hotel.'
                })
            if not room_type.is_active or not room_type.is_available:
                raise serializers.ValidationError({'items': f'{room_type.name} is currently unavailable.'})

            resolved_items.append({'room_type': room_type, 'quantity': quantity})
            total_adults_capacity += room_type.max_adults * quantity
            total_children_capacity += room_type.max_children * quantity
            total_occupancy_capacity += room_type.max_occupancy * quantity

            room_type_verified = self._check_room_type_availability(
                room_type=room_type, quantity=quantity, check_in=check_in, check_out=check_out,
            )
            # Verified only if every room type in this multi-room booking had
            # real calendar data -- one unverified room type is enough doubt
            # to treat the whole booking as needing a host to confirm it.
            attrs['_calendar_verified'] = attrs.get('_calendar_verified', True) and room_type_verified

        num_adults = attrs['num_adults']
        num_children = attrs['num_children']
        if num_adults > total_adults_capacity:
            raise serializers.ValidationError({
                'num_adults': f'Selected rooms only accommodate {total_adults_capacity} adult(s) in total.'
            })
        if num_children > total_children_capacity:
            raise serializers.ValidationError({
                'num_children': f'Selected rooms only accommodate {total_children_capacity} child(ren) in total.'
            })
        if (num_adults + num_children) > total_occupancy_capacity:
            raise serializers.ValidationError({
                'num_adults': f'Selected rooms only accommodate {total_occupancy_capacity} guest(s) in total.'
            })

        attrs['_resolved_items'] = resolved_items
        return attrs

    def _check_room_type_availability(self, *, room_type, quantity, check_in, check_out, for_update=False):
        """Returns True if real RoomAvailability data covered these dates (calendar_verified), False otherwise."""
        stay_dates = []
        current_date = check_in
        while current_date < check_out:
            stay_dates.append(current_date)
            current_date += timedelta(days=1)

        overlapping_item_quantity = _exclude_expired_holds(BookingItem.objects.filter(
            room_type=room_type,
            booking__check_in__lt=check_out,
            booking__check_out__gt=check_in,
        ).exclude(
            booking__status=Booking.BookingStatus.CANCELLED,
        ), path='booking__').aggregate(total=Sum('quantity'))['total'] or 0

        # Legacy single-room-type bookings (no BookingItem row) each occupy
        # exactly one unit of this room type — they share the same
        # RoomAvailability pool, so both paths must be counted together.
        overlapping_legacy_count = _exclude_expired_holds(Booking.objects.filter(
            room_type=room_type,
        ).exclude(
            status=Booking.BookingStatus.CANCELLED,
        ).filter(
            check_in__lt=check_out, check_out__gt=check_in,
        )).count()

        overlapping_quantity = overlapping_item_quantity + overlapping_legacy_count

        avail_qs = RoomAvailability.objects.filter(
            room_type=room_type, date__gte=check_in, date__lt=check_out,
        )
        if for_update:
            avail_qs = avail_qs.select_for_update()
        availability_rows = {row.date: row for row in avail_qs}

        if not availability_rows:
            return False

        for stay_date in stay_dates:
            availability = availability_rows.get(stay_date)
            if availability is None:
                continue
            if availability.status != RoomAvailability.AvailabilityStatus.AVAILABLE:
                raise serializers.ValidationError({
                    'items': f'No vacancy for {room_type.name} on {stay_date}.'
                })
            remaining = availability.available_rooms - overlapping_quantity
            if remaining < quantity:
                raise serializers.ValidationError({
                    'items': f'Only {max(remaining, 0)} {room_type.name} room(s) left on {stay_date}.'
                })
        return True

    def create(self, validated_data):
        hotel = validated_data['_hotel']
        resolved_items = validated_data['_resolved_items']
        check_in = validated_data['check_in']
        check_out = validated_data['check_out']
        total_nights = (check_out - check_in).days

        payment_method = validated_data.get('payment_method', Booking.PaymentMethod.PAY_AT_PREMISES)
        payment_status = (
            Booking.PaymentStatus.PENDING if payment_method == Booking.PaymentMethod.ONLINE
            else Booking.PaymentStatus.UNPAID
        )

        with transaction.atomic():
            # Re-check availability under row locks to close the race window
            # between validate() (unlocked, for fast user-facing feedback)
            # and this commit.
            for entry in resolved_items:
                self._check_room_type_availability(
                    room_type=entry['room_type'], quantity=entry['quantity'],
                    check_in=check_in, check_out=check_out, for_update=True,
                )

            lowest_nightly_price = min(entry['room_type'].base_price for entry in resolved_items)
            currency = resolved_items[0]['room_type'].currency
            total_amount = sum(
                (entry['room_type'].base_price * entry['quantity'] * total_nights for entry in resolved_items),
                start=0,
            )
            calendar_verified = validated_data.get('_calendar_verified', True)
            hold_window = (
                timedelta(minutes=settings.BOOKING_HOLD_MINUTES) if calendar_verified
                else timedelta(hours=settings.BOOKING_HOST_RESPONSE_SLA_HOURS)
            )

            booking = Booking(
                traveler=validated_data['traveler'],
                hotel=hotel,
                room_type=None,
                check_in=check_in,
                check_out=check_out,
                num_adults=validated_data['num_adults'],
                num_children=validated_data['num_children'],
                special_requests=validated_data.get('special_requests', ''),
                nightly_price=lowest_nightly_price,
                currency=currency,
                total_nights=total_nights,
                total_amount=total_amount,
                calendar_verified=calendar_verified,
                hold_expires_at=timezone.now() + hold_window,
                payment_method=payment_method,
                payment_status=payment_status,
                guest_full_name=validated_data['guest_full_name'],
                guest_email=validated_data['guest_email'],
                guest_phone=validated_data.get('guest_phone', ''),
            )
            booking._has_booking_items = True
            booking.save()

            BookingItem.objects.bulk_create([
                BookingItem(
                    booking=booking,
                    room_type=entry['room_type'],
                    quantity=entry['quantity'],
                    nightly_price=entry['room_type'].base_price,
                    subtotal=entry['room_type'].base_price * entry['quantity'] * total_nights,
                )
                for entry in resolved_items
            ])

        return booking
