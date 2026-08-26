"""
Serializers for bookings app
"""
from datetime import timedelta

from rest_framework import serializers

from .models import Booking
from apps.listings.serializers import RoomTypeListSerializer, BnBListingSerializer
from apps.listings.models import RoomType, BnBListing, BnBAvailability, RoomAvailability


class BookingSerializer(serializers.ModelSerializer):
    traveler = serializers.PrimaryKeyRelatedField(read_only=True)
    hotel = serializers.PrimaryKeyRelatedField(read_only=True, allow_null=True)
    room_type_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    room_type = RoomTypeListSerializer(read_only=True, allow_null=True)
    bnb_listing_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    bnb_listing = BnBListingSerializer(read_only=True, allow_null=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'traveler', 'hotel', 'room_type', 'room_type_id',
            'bnb_listing', 'bnb_listing_id',
            'check_in', 'check_out', 'num_adults', 'num_children',
            'special_requests', 'nightly_price', 'currency', 'total_nights',
            'total_amount', 'deposit_amount', 'status', 'payment_method',
            'payment_status', 'guest_full_name', 'guest_email', 'guest_phone',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'traveler', 'hotel', 'nightly_price', 'currency', 'total_nights',
            'total_amount', 'status', 'payment_status', 'created_at', 'updated_at'
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
                if overlap_qs.exists():
                    raise serializers.ValidationError({
                        'check_in': 'These dates are already booked for this listing.'
                    })

                blocked_day = (
                    BnBAvailability.objects.filter(
                        bnb_listing=bnb_listing,
                        date__gte=check_in,
                        date__lt=check_out,
                    )
                    .exclude(status=BnBAvailability.AvailabilityStatus.AVAILABLE)
                    .order_by('date')
                    .first()
                )
                if blocked_day:
                    raise serializers.ValidationError({
                        'check_in': f'This listing is unavailable on {blocked_day.date} ({blocked_day.status}).'
                    })
        
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
        validated_data.pop('_hotel_availability', None)
        
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
        elif bnb_listing_id:
            # BnB booking
            bnb_listing = bnb_listing or BnBListing.objects.get(pk=bnb_listing_id)
            validated_data['bnb_listing'] = bnb_listing
            # Set pricing from BnB listing
            if 'nightly_price' not in validated_data:
                validated_data['nightly_price'] = bnb_listing.price_per_night
            if 'currency' not in validated_data:
                validated_data['currency'] = bnb_listing.currency or 'KES'
        
        # Calculate total nights and amount
        check_in = validated_data['check_in']
        check_out = validated_data['check_out']
        total_nights = (check_out - check_in).days
        validated_data['total_nights'] = total_nights
        
        if 'total_amount' not in validated_data:
            nightly_price = validated_data.get('nightly_price', 0)
            validated_data['total_amount'] = nightly_price * total_nights

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

    class Meta:
        model = Booking
        fields = [
            'id', 'check_in', 'check_out', 'total_nights', 'total_amount',
            'currency', 'status', 'payment_status', 'room_type', 'bnb_listing',
            'booking_type', 'created_at'
        ]

    def get_booking_type(self, obj):
        """Return 'hotel' or 'bnb' based on booking type"""
        return 'hotel' if obj.hotel else 'bnb'


class BookingDetailSerializer(BookingSerializer):
    booking_type = serializers.SerializerMethodField()
    
    class Meta(BookingSerializer.Meta):
        fields = BookingSerializer.Meta.fields + ['booking_type']
    
    def get_booking_type(self, obj):
        """Return 'hotel' or 'bnb' based on booking type"""
        return 'hotel' if obj.hotel else 'bnb'


class HostBookingListSerializer(serializers.ModelSerializer):
    traveler_name = serializers.CharField(source='traveler.get_display_name', read_only=True)
    traveler_email = serializers.CharField(source='traveler.email', read_only=True)
    hotel_id = serializers.IntegerField(source='hotel.id', read_only=True, allow_null=True)
    hotel_name = serializers.CharField(source='hotel.name', read_only=True, allow_null=True)
    room_name = serializers.CharField(source='room_type.name', read_only=True, allow_null=True)
    bnb_listing_id = serializers.IntegerField(source='bnb_listing.id', read_only=True, allow_null=True)
    bnb_listing_title = serializers.CharField(source='bnb_listing.title', read_only=True, allow_null=True)
    booking_type = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            'id', 'check_in', 'check_out', 'total_nights', 'total_amount', 'currency',
            'status', 'payment_status', 'payment_method', 'created_at', 'updated_at',
            'traveler_name', 'traveler_email',
            'guest_full_name', 'guest_email', 'guest_phone',
            'hotel_id', 'hotel_name', 'room_name',
            'bnb_listing_id', 'bnb_listing_title',
            'booking_type',
        ]

    def get_booking_type(self, obj):
        return 'hotel' if obj.hotel_id else 'bnb'
