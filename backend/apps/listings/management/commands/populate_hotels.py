"""
Management command to populate sample hotel data
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.listings.models import Hotel, HotelAmenity, HotelAmenityMapping, HotelImage

User = get_user_model()


class Command(BaseCommand):
    help = 'Populate sample hotel data for testing'

    def handle(self, *args, **options):
        self.stdout.write('Creating sample hotels...')

        # Create a sample host user if it doesn't exist
        host, created = User.objects.get_or_create(
            email='host@msafirispace.com',
            defaults={
                'username': 'host@msafirispace.com',
                'first_name': 'John',
                'last_name': 'Host',
                'user_type': User.UserType.HOST,
                'is_verified': True,
                'company_name': 'Msafiri Hotels Ltd',
                'business_license': 'BL123456',
                'tax_id': 'TAX789012'
            }
        )
        if created:
            host.set_password('password123')
            host.save()
            self.stdout.write(f'Created host user: {host.email}')

        # Create amenities
        amenities_data = [
            # General amenities
            {'name': 'Free WiFi', 'category': 'general', 'icon': 'wifi'},
            {'name': 'Parking', 'category': 'general', 'icon': 'car'},
            {'name': 'Airport Shuttle', 'category': 'transportation', 'icon': 'bus'},
            {'name': '24/7 Front Desk', 'category': 'general', 'icon': 'clock'},
            {'name': 'Concierge Service', 'category': 'general', 'icon': 'user-group'},
            
            # Room amenities
            {'name': 'Air Conditioning', 'category': 'room', 'icon': 'snowflake'},
            {'name': 'Minibar', 'category': 'room', 'icon': 'wine'},
            {'name': 'Room Service', 'category': 'room', 'icon': 'bell'},
            {'name': 'Safe', 'category': 'room', 'icon': 'shield-check'},
            {'name': 'Balcony', 'category': 'room', 'icon': 'home'},
            
            # Recreation amenities
            {'name': 'Swimming Pool', 'category': 'recreation', 'icon': 'sun'},
            {'name': 'Fitness Center', 'category': 'recreation', 'icon': 'fire'},
            {'name': 'Spa', 'category': 'recreation', 'icon': 'sparkles'},
            {'name': 'Tennis Court', 'category': 'recreation', 'icon': 'sport'},
            
            # Dining amenities
            {'name': 'Restaurant', 'category': 'dining', 'icon': 'cake'},
            {'name': 'Bar', 'category': 'dining', 'icon': 'wine'},
            {'name': 'Breakfast Included', 'category': 'dining', 'icon': 'cake'},
            
            # Business amenities
            {'name': 'Business Center', 'category': 'business', 'icon': 'computer'},
            {'name': 'Meeting Rooms', 'category': 'business', 'icon': 'users'},
            {'name': 'Conference Facilities', 'category': 'business', 'icon': 'presentation'},
        ]

        amenities = {}
        for amenity_data in amenities_data:
            amenity, created = HotelAmenity.objects.get_or_create(
                name=amenity_data['name'],
                defaults=amenity_data
            )
            amenities[amenity_data['name']] = amenity
            if created:
                self.stdout.write(f'Created amenity: {amenity.name}')

        # Create sample hotels
        hotels_data = [
            {
                'name': 'Serena Hotel Nairobi',
                'description': 'Experience luxury and elegance at Serena Hotel Nairobi, located in the heart of Kenya\'s capital city. Our 5-star hotel offers world-class amenities, exceptional service, and breathtaking views of the city skyline. Perfect for both business and leisure travelers.',
                'short_description': 'Luxury 5-star hotel in the heart of Nairobi with world-class amenities and exceptional service.',
                'property_type': 'luxury_hotel',
                'star_rating': 5,
                'address': 'Kenyatta Avenue, Nairobi',
                'city': 'Nairobi',
                'state_province': 'Nairobi County',
                'country': 'Kenya',
                'postal_code': '00100',
                'latitude': -1.2921,
                'longitude': 36.8219,
                'phone': '+254 20 284 2000',
                'email': 'nairobi@serena.co.ke',
                'website': 'https://www.serenahotels.com/nairobi',
                'is_verified': True,
                'is_featured': True,
                'amenities': [
                    'Free WiFi', 'Parking', 'Airport Shuttle', '24/7 Front Desk',
                    'Air Conditioning', 'Minibar', 'Room Service', 'Safe',
                    'Swimming Pool', 'Fitness Center', 'Spa', 'Restaurant',
                    'Bar', 'Business Center', 'Meeting Rooms'
                ]
            },
            {
                'name': 'Sarova Stanley Hotel',
                'description': 'A historic landmark in Nairobi, Sarova Stanley Hotel combines classic elegance with modern comfort. Located in the central business district, this iconic hotel has been welcoming guests for over a century with its timeless charm and impeccable service.',
                'short_description': 'Historic landmark hotel in Nairobi\'s CBD with classic elegance and modern comfort.',
                'property_type': 'hotel',
                'star_rating': 4,
                'address': 'Corner of Kimathi Street and Kenyatta Avenue',
                'city': 'Nairobi',
                'state_province': 'Nairobi County',
                'country': 'Kenya',
                'postal_code': '00100',
                'latitude': -1.2921,
                'longitude': 36.8219,
                'phone': '+254 20 275 7000',
                'email': 'stanley@sarovahotels.com',
                'website': 'https://www.sarovahotels.com/stanley',
                'is_verified': True,
                'is_featured': True,
                'amenities': [
                    'Free WiFi', 'Parking', '24/7 Front Desk', 'Concierge Service',
                    'Air Conditioning', 'Room Service', 'Safe', 'Balcony',
                    'Swimming Pool', 'Restaurant', 'Bar', 'Breakfast Included',
                    'Business Center'
                ]
            },
            {
                'name': 'Tribe Hotel Nairobi',
                'description': 'A contemporary boutique hotel that celebrates African culture and modern design. Tribe Hotel offers a unique blend of traditional hospitality and contemporary luxury, making it the perfect choice for discerning travelers seeking an authentic African experience.',
                'short_description': 'Contemporary boutique hotel celebrating African culture with modern design and luxury.',
                'property_type': 'boutique_hotel',
                'star_rating': 4,
                'address': 'Gigiri, Nairobi',
                'city': 'Nairobi',
                'state_province': 'Nairobi County',
                'country': 'Kenya',
                'postal_code': '00621',
                'latitude': -1.2200,
                'longitude': 36.8100,
                'phone': '+254 20 720 0000',
                'email': 'info@tribehotel.com',
                'website': 'https://www.tribehotel.com',
                'is_verified': True,
                'is_featured': False,
                'amenities': [
                    'Free WiFi', 'Parking', 'Airport Shuttle', '24/7 Front Desk',
                    'Air Conditioning', 'Minibar', 'Room Service', 'Safe',
                    'Swimming Pool', 'Fitness Center', 'Spa', 'Restaurant',
                    'Bar', 'Breakfast Included', 'Business Center', 'Meeting Rooms'
                ]
            },
            {
                'name': 'Hemingways Nairobi',
                'description': 'A luxury boutique hotel inspired by the legendary writer Ernest Hemingway. Located in the leafy suburb of Karen, this intimate hotel offers personalized service, elegant accommodations, and a peaceful retreat from the bustling city.',
                'short_description': 'Luxury boutique hotel in Karen inspired by Ernest Hemingway with personalized service.',
                'property_type': 'boutique_hotel',
                'star_rating': 5,
                'address': 'Karen Road, Karen',
                'city': 'Nairobi',
                'state_province': 'Nairobi County',
                'country': 'Kenya',
                'postal_code': '00502',
                'latitude': -1.3200,
                'longitude': 36.6800,
                'phone': '+254 20 388 0000',
                'email': 'reservations@hemingways.co.ke',
                'website': 'https://www.hemingways.co.ke',
                'is_verified': True,
                'is_featured': True,
                'amenities': [
                    'Free WiFi', 'Parking', 'Airport Shuttle', '24/7 Front Desk',
                    'Concierge Service', 'Air Conditioning', 'Minibar', 'Room Service',
                    'Safe', 'Balcony', 'Swimming Pool', 'Spa', 'Restaurant',
                    'Bar', 'Breakfast Included', 'Business Center'
                ]
            },
            {
                'name': 'Fairmont The Norfolk',
                'description': 'A historic luxury hotel that has been a Nairobi landmark since 1904. Fairmont The Norfolk combines colonial charm with modern amenities, offering guests a unique blend of history, elegance, and contemporary comfort in the heart of the city.',
                'short_description': 'Historic luxury hotel since 1904 with colonial charm and modern amenities.',
                'property_type': 'luxury_hotel',
                'star_rating': 5,
                'address': 'Harry Thuku Road, Nairobi',
                'city': 'Nairobi',
                'state_province': 'Nairobi County',
                'country': 'Kenya',
                'postal_code': '00100',
                'latitude': -1.2921,
                'longitude': 36.8219,
                'phone': '+254 20 226 5000',
                'email': 'norfolk@fairmont.com',
                'website': 'https://www.fairmont.com/norfolk',
                'is_verified': True,
                'is_featured': True,
                'amenities': [
                    'Free WiFi', 'Parking', 'Airport Shuttle', '24/7 Front Desk',
                    'Concierge Service', 'Air Conditioning', 'Minibar', 'Room Service',
                    'Safe', 'Swimming Pool', 'Fitness Center', 'Spa', 'Tennis Court',
                    'Restaurant', 'Bar', 'Breakfast Included', 'Business Center',
                    'Meeting Rooms', 'Conference Facilities'
                ]
            }
        ]

        for hotel_data in hotels_data:
            amenities_list = hotel_data.pop('amenities', [])
            
            hotel, created = Hotel.objects.get_or_create(
                name=hotel_data['name'],
                defaults={**hotel_data, 'host': host}
            )
            
            if created:
                self.stdout.write(f'Created hotel: {hotel.name}')
                
                # Add amenities to hotel
                for amenity_name in amenities_list:
                    if amenity_name in amenities:
                        HotelAmenityMapping.objects.create(
                            hotel=hotel,
                            amenity=amenities[amenity_name],
                            is_available=True
                        )
            else:
                self.stdout.write(f'Hotel already exists: {hotel.name}')

        self.stdout.write(
            self.style.SUCCESS('Successfully populated sample hotel data!')
        )
