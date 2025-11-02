"""
Management command to populate sample room data
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.listings.models import Hotel, RoomType, RoomAmenity, RoomAmenityMapping, RoomAvailability
from datetime import datetime, timedelta
from decimal import Decimal

User = get_user_model()


class Command(BaseCommand):
    help = 'Populate sample room data for testing'

    def handle(self, *args, **options):
        self.stdout.write('Creating sample room data...')

        # Get existing hotels
        hotels = Hotel.objects.all()
        if not hotels.exists():
            self.stdout.write('No hotels found. Please run populate_hotels first.')
            return

        # Create room amenities
        room_amenities_data = [
            # Bedroom amenities
            {'name': 'Air Conditioning', 'category': 'bedroom', 'icon': 'snowflake'},
            {'name': 'King Size Bed', 'category': 'bedroom', 'icon': 'bed'},
            {'name': 'Queen Size Bed', 'category': 'bedroom', 'icon': 'bed'},
            {'name': 'Twin Beds', 'category': 'bedroom', 'icon': 'bed'},
            {'name': 'Sofa Bed', 'category': 'bedroom', 'icon': 'sofa'},
            {'name': 'Blackout Curtains', 'category': 'bedroom', 'icon': 'eye-slash'},
            {'name': 'Extra Pillows', 'category': 'bedroom', 'icon': 'pill'},
            {'name': 'Extra Blankets', 'category': 'bedroom', 'icon': 'blanket'},
            
            # Bathroom amenities
            {'name': 'Private Bathroom', 'category': 'bathroom', 'icon': 'bath'},
            {'name': 'Bathtub', 'category': 'bathroom', 'icon': 'bath'},
            {'name': 'Rain Shower', 'category': 'bathroom', 'icon': 'shower'},
            {'name': 'Hair Dryer', 'category': 'bathroom', 'icon': 'wind'},
            {'name': 'Towels', 'category': 'bathroom', 'icon': 'towel'},
            {'name': 'Bathrobes', 'category': 'bathroom', 'icon': 'robe'},
            {'name': 'Toiletries', 'category': 'bathroom', 'icon': 'soap'},
            
            # Entertainment amenities
            {'name': 'Flat Screen TV', 'category': 'entertainment', 'icon': 'tv'},
            {'name': 'Cable TV', 'category': 'entertainment', 'icon': 'antenna'},
            {'name': 'Netflix', 'category': 'entertainment', 'icon': 'play'},
            {'name': 'Sound System', 'category': 'entertainment', 'icon': 'speaker'},
            {'name': 'DVD Player', 'category': 'entertainment', 'icon': 'disc'},
            
            # Comfort amenities
            {'name': 'Mini Bar', 'category': 'comfort', 'icon': 'wine'},
            {'name': 'Coffee Machine', 'category': 'comfort', 'icon': 'coffee'},
            {'name': 'Tea Kettle', 'category': 'comfort', 'icon': 'kettle'},
            {'name': 'Safe', 'category': 'comfort', 'icon': 'shield-check'},
            {'name': 'Iron & Ironing Board', 'category': 'comfort', 'icon': 'iron'},
            {'name': 'Desk', 'category': 'comfort', 'icon': 'desk'},
            {'name': 'Seating Area', 'category': 'comfort', 'icon': 'chair'},
            
            # Connectivity amenities
            {'name': 'Free WiFi', 'category': 'connectivity', 'icon': 'wifi'},
            {'name': 'Ethernet Connection', 'category': 'connectivity', 'icon': 'cable'},
            {'name': 'USB Charging Ports', 'category': 'connectivity', 'icon': 'bolt'},
            {'name': 'Phone', 'category': 'connectivity', 'icon': 'phone'},
            
            # Kitchen amenities
            {'name': 'Kitchenette', 'category': 'kitchen', 'icon': 'kitchen'},
            {'name': 'Refrigerator', 'category': 'kitchen', 'icon': 'refrigerator'},
            {'name': 'Microwave', 'category': 'kitchen', 'icon': 'microwave'},
            {'name': 'Dining Table', 'category': 'kitchen', 'icon': 'table'},
            {'name': 'Cooking Utensils', 'category': 'kitchen', 'icon': 'utensils'},
            
            # Outdoor amenities
            {'name': 'Balcony', 'category': 'outdoor', 'icon': 'balcony'},
            {'name': 'Terrace', 'category': 'outdoor', 'icon': 'terrace'},
            {'name': 'Garden View', 'category': 'outdoor', 'icon': 'tree'},
            {'name': 'Sea View', 'category': 'outdoor', 'icon': 'water'},
            {'name': 'City View', 'category': 'outdoor', 'icon': 'building'},
        ]

        room_amenities = {}
        for amenity_data in room_amenities_data:
            amenity, created = RoomAmenity.objects.get_or_create(
                name=amenity_data['name'],
                defaults=amenity_data
            )
            room_amenities[amenity_data['name']] = amenity
            if created:
                self.stdout.write(f'Created room amenity: {amenity.name}')

        # Create room types for each hotel
        for hotel in hotels:
            self.stdout.write(f'Creating room types for {hotel.name}...')
            
            # Standard Room
            standard_room, created = RoomType.objects.get_or_create(
                hotel=hotel,
                name='Standard Room',
                defaults={
                    'category': 'standard',
                    'description': f'A comfortable standard room at {hotel.name} with modern amenities and a cozy atmosphere. Perfect for business travelers and short stays.',
                    'short_description': 'Comfortable standard room with modern amenities',
                    'size_sqm': Decimal('25.00'),
                    'bed_type': 'double',
                    'bed_count': 1,
                    'max_occupancy': 2,
                    'max_adults': 2,
                    'max_children': 0,
                    'base_price': Decimal('150.00'),
                    'currency': 'KES',
                    'has_balcony': False,
                    'has_kitchen': False,
                    'has_living_room': False,
                    'has_dining_area': False,
                    'has_workspace': True,
                    'has_bathtub': False,
                    'has_shower': True,
                    'has_sea_view': False,
                    'has_city_view': True,
                    'has_garden_view': False,
                }
            )
            
            if created:
                # Add amenities to standard room
                standard_amenities = [
                    'Air Conditioning', 'King Size Bed', 'Private Bathroom',
                    'Rain Shower', 'Hair Dryer', 'Towels', 'Flat Screen TV',
                    'Cable TV', 'Mini Bar', 'Coffee Machine', 'Safe',
                    'Desk', 'Free WiFi', 'USB Charging Ports', 'Phone'
                ]
                for amenity_name in standard_amenities:
                    if amenity_name in room_amenities:
                        RoomAmenityMapping.objects.create(
                            room_type=standard_room,
                            amenity=room_amenities[amenity_name],
                            is_available=True
                        )

            # Deluxe Room
            deluxe_room, created = RoomType.objects.get_or_create(
                hotel=hotel,
                name='Deluxe Room',
                defaults={
                    'category': 'deluxe',
                    'description': f'Spacious deluxe room at {hotel.name} featuring premium amenities, elegant decor, and enhanced comfort. Ideal for leisure travelers seeking extra space and luxury.',
                    'short_description': 'Spacious deluxe room with premium amenities',
                    'size_sqm': Decimal('35.00'),
                    'bed_type': 'king',
                    'bed_count': 1,
                    'max_occupancy': 3,
                    'max_adults': 2,
                    'max_children': 1,
                    'base_price': Decimal('250.00'),
                    'currency': 'KES',
                    'has_balcony': True,
                    'has_kitchen': False,
                    'has_living_room': True,
                    'has_dining_area': False,
                    'has_workspace': True,
                    'has_bathtub': True,
                    'has_shower': True,
                    'has_sea_view': False,
                    'has_city_view': True,
                    'has_garden_view': False,
                }
            )
            
            if created:
                # Add amenities to deluxe room
                deluxe_amenities = [
                    'Air Conditioning', 'King Size Bed', 'Private Bathroom',
                    'Bathtub', 'Rain Shower', 'Hair Dryer', 'Bathrobes',
                    'Towels', 'Toiletries', 'Flat Screen TV', 'Netflix',
                    'Sound System', 'Mini Bar', 'Coffee Machine', 'Safe',
                    'Iron & Ironing Board', 'Desk', 'Seating Area',
                    'Free WiFi', 'USB Charging Ports', 'Phone', 'Balcony'
                ]
                for amenity_name in deluxe_amenities:
                    if amenity_name in room_amenities:
                        RoomAmenityMapping.objects.create(
                            room_type=deluxe_room,
                            amenity=room_amenities[amenity_name],
                            is_available=True
                        )

            # Suite
            suite_room, created = RoomType.objects.get_or_create(
                hotel=hotel,
                name='Executive Suite',
                defaults={
                    'category': 'suite',
                    'description': f'Luxurious executive suite at {hotel.name} with separate living and sleeping areas, premium furnishings, and exclusive amenities. Perfect for extended stays and special occasions.',
                    'short_description': 'Luxurious suite with separate living and sleeping areas',
                    'size_sqm': Decimal('60.00'),
                    'bed_type': 'king',
                    'bed_count': 1,
                    'max_occupancy': 4,
                    'max_adults': 2,
                    'max_children': 2,
                    'base_price': Decimal('450.00'),
                    'currency': 'KES',
                    'has_balcony': True,
                    'has_kitchen': True,
                    'has_living_room': True,
                    'has_dining_area': True,
                    'has_workspace': True,
                    'has_bathtub': True,
                    'has_shower': True,
                    'has_sea_view': False,
                    'has_city_view': True,
                    'has_garden_view': False,
                }
            )
            
            if created:
                # Add amenities to suite
                suite_amenities = [
                    'Air Conditioning', 'King Size Bed', 'Sofa Bed',
                    'Private Bathroom', 'Bathtub', 'Rain Shower',
                    'Hair Dryer', 'Bathrobes', 'Towels', 'Toiletries',
                    'Flat Screen TV', 'Netflix', 'Sound System',
                    'Mini Bar', 'Coffee Machine', 'Tea Kettle',
                    'Safe', 'Iron & Ironing Board', 'Desk',
                    'Seating Area', 'Kitchenette', 'Refrigerator',
                    'Microwave', 'Dining Table', 'Free WiFi',
                    'USB Charging Ports', 'Phone', 'Balcony'
                ]
                for amenity_name in suite_amenities:
                    if amenity_name in room_amenities:
                        RoomAmenityMapping.objects.create(
                            room_type=suite_room,
                            amenity=room_amenities[amenity_name],
                            is_available=True
                        )

            # Create availability for the next 90 days
            self.create_availability(standard_room, 90)
            self.create_availability(deluxe_room, 90)
            self.create_availability(suite_room, 90)

        self.stdout.write(
            self.style.SUCCESS('Successfully populated sample room data!')
        )

    def create_availability(self, room_type, days):
        """Create availability records for a room type"""
        from datetime import date, timedelta
        
        start_date = date.today()
        for i in range(days):
            current_date = start_date + timedelta(days=i)
            
            # Create availability record
            availability, created = RoomAvailability.objects.get_or_create(
                room_type=room_type,
                date=current_date,
                defaults={
                    'status': 'available',
                    'available_rooms': 5,  # 5 rooms of each type available
                    'total_rooms': 5,
                    'min_stay': 1,
                    'max_stay': 30,
                }
            )
            
            # Add some price variations for weekends and holidays
            if current_date.weekday() >= 5:  # Weekend
                availability.price_override = room_type.base_price * Decimal('1.2')
                availability.save()
