"""
Serializers for the Users app
"""
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import User, UserProfile, UserAddress, BnBHostProfile, HotelRestaurantHostProfile


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration
    """
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    roles = serializers.MultipleChoiceField(choices=User.Role.choices, required=False, default=[User.Role.GUEST])
    referral_code = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'email', 'username', 'first_name', 'last_name', 'password', 'password_confirm',
            'phone_number', 'roles', 'company_name', 'business_license', 'tax_id', 'referral_code'
        ]
        extra_kwargs = {
            'username': {'required': False},
            'company_name': {'required': False},
            'business_license': {'required': False},
            'tax_id': {'required': False},
        }
    
    def validate(self, attrs):
        # Check if passwords match
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        
        # Validate password strength
        try:
            validate_password(attrs['password'])
        except ValidationError as e:
            raise serializers.ValidationError({'password': e.messages})
        
        # Generate username if not provided
        if not attrs.get('username'):
            attrs['username'] = attrs['email']
        
        # Validate roles
        selected_roles = attrs.get('roles', [])
        if not selected_roles:
            raise serializers.ValidationError("At least one role must be selected.")
        
        # Validate host-specific fields if any host role is selected
        host_roles = [r for r in selected_roles if r in [User.Role.BNB_HOST, User.Role.HOTEL_HOST]]
        if host_roles and not attrs.get('company_name'):
            raise serializers.ValidationError("Company name is required for host roles.")
        
        return attrs
    
    def create(self, validated_data):
        # Remove password_confirm from validated data
        validated_data.pop('password_confirm')
        roles_data = validated_data.pop('roles', [User.Role.GUEST])
        referral_code = (validated_data.pop('referral_code', '') or '').strip()

        # Create user
        user = User.objects.create_user(**validated_data)

        # A typo'd or expired referral code shouldn't block registration --
        # silently skip it rather than raising a validation error.
        if referral_code:
            referrer = User.objects.filter(referral_code=referral_code, is_active=True).exclude(pk=user.pk).first()
            if referrer:
                user.referred_by = referrer
        
        # Create user profile
        UserProfile.objects.create(user=user)
        
        # Set roles and active role
        roles_list = list(roles_data)
        user.roles = roles_list
        user.active_role = roles_list[0] if roles_list else User.Role.GUEST
        user.save()
        
        # Create host-specific profiles if host roles are selected
        if User.Role.BNB_HOST in roles_data:
            BnBHostProfile.objects.create(user=user)
        if User.Role.HOTEL_HOST in roles_data:
            HotelRestaurantHostProfile.objects.create(user=user)
        return user


class UserLoginSerializer(serializers.Serializer):
    """
    Serializer for user login
    """
    email = serializers.EmailField()
    password = serializers.CharField()
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            # Try authenticating when username == email (legacy behavior).
            user = authenticate(username=email, password=password)
            
            if not user:
                # Fallback: resolve username by email, then authenticate.
                account = User.objects.filter(email__iexact=email).first()
                if account:
                    user = authenticate(username=account.username, password=password)
            
            if not user:
                raise serializers.ValidationError('Invalid credentials')
            
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled')
            
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError('Must include email and password')


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for user profile
    """
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    user_type = serializers.CharField(source='user.user_type', read_only=True)
    host_type = serializers.CharField(source='user.host_type', read_only=True)
    roles = serializers.ListField(source='user.roles', read_only=True)
    active_role = serializers.CharField(source='user.active_role', read_only=True)
    is_verified = serializers.BooleanField(source='user.is_verified', read_only=True)
    is_premium = serializers.BooleanField(source='user.is_premium', read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'id', 'user', 'email', 'first_name', 'last_name', 'username', 'user_type',
            'host_type', 'roles', 'active_role', 'is_verified', 'is_premium', 'travel_style', 'preferred_accommodation_type',
            'dietary_restrictions', 'accessibility_needs', 'host_rating', 'total_reviews',
            'response_time', 'acceptance_rate', 'website', 'facebook', 'instagram',
            'twitter', 'linkedin', 'languages_spoken', 'certifications', 'awards',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'host_rating', 'total_reviews']


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user information
    """
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'phone_number', 'date_of_birth', 'gender',
            'bio', 'location', 'city', 'country', 'preferred_language', 'preferred_currency'
        ]


class UserAddressSerializer(serializers.ModelSerializer):
    """
    Serializer for user addresses
    """
    class Meta:
        model = UserAddress
        fields = [
            'id', 'address_type', 'street_address', 'street_address2', 'city',
            'state_province', 'postal_code', 'country', 'is_default', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserDetailSerializer(serializers.ModelSerializer):
    """
    Comprehensive user serializer for detailed views
    """
    profile = UserProfileSerializer(read_only=True)
    addresses = UserAddressSerializer(many=True, read_only=True)
    referral_code = serializers.CharField(read_only=True)
    referred_by = serializers.PrimaryKeyRelatedField(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'phone_number',
            'date_of_birth', 'gender', 'profile_picture', 'bio', 'location', 'city',
            'country', 'user_type', 'host_type', 'roles', 'active_role', 'is_verified', 'is_premium', 'company_name',
            'business_license', 'tax_id', 'preferred_language', 'preferred_currency', 'notification_preferences',
            'referral_code', 'referred_by', 'profile', 'addresses', 'created_at',
            'updated_at', 'last_login'
        ]
        read_only_fields = [
            'id', 'email', 'username', 'user_type', 'is_verified', 'is_premium',
            'referral_code', 'referred_by', 'created_at', 'updated_at', 'last_login'
        ]


class RoleActionSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=[r for r, _ in getattr(User, 'Role').choices])


class SwitchRoleSerializer(RoleActionSerializer):
    pass


class AddRoleSerializer(RoleActionSerializer):
    pass


class PasswordChangeSerializer(serializers.Serializer):
    """
    Serializer for password change
    """
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)
    new_password_confirm = serializers.CharField(required=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError("New passwords don't match")
        
        try:
            validate_password(attrs['new_password'])
        except ValidationError as e:
            raise serializers.ValidationError({'new_password': e.messages})
        
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Serializer for password reset request. Deliberately does NOT validate
    that the email belongs to a real account -- doing so would let an
    attacker enumerate registered emails by watching which addresses this
    endpoint accepts vs rejects. The view sends the response unconditionally
    and only sends mail when a matching account actually exists.
    """
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Serializer for password reset confirmation
    """
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8)
    new_password_confirm = serializers.CharField()
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        
        try:
            validate_password(attrs['new_password'])
        except ValidationError as e:
            raise serializers.ValidationError({'new_password': e.messages})
        
        return attrs


class EmailVerificationSerializer(serializers.Serializer):
    """
    Serializer for email verification
    """
    token = serializers.CharField()


class ReferralSerializer(serializers.Serializer):
    """
    Serializer for referral information
    """
    referral_code = serializers.CharField(max_length=20)
    
    def validate_referral_code(self, value):
        if not User.objects.filter(referral_code=value, is_active=True).exists():
            raise serializers.ValidationError("Invalid referral code")
        return value


class UserStatsSerializer(serializers.Serializer):
    """
    Serializer for user statistics
    """
    total_bookings = serializers.IntegerField()
    total_reviews = serializers.IntegerField()
    average_rating = serializers.DecimalField(max_digits=3, decimal_places=2)
    total_spent = serializers.DecimalField(max_digits=10, decimal_places=2)
    favorite_destinations = serializers.ListField(child=serializers.CharField())
    member_since = serializers.DateTimeField()


class BnBHostProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for BnB Host Profile
    """
    class Meta:
        model = BnBHostProfile
        fields = [
            'property_count', 'max_properties', 'home_sharing_license', 'insurance_document',
            'property_management_style', 'guest_interaction_level', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class HotelRestaurantHostProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for Hotel/Restaurant Host Profile
    """
    class Meta:
        model = HotelRestaurantHostProfile
        fields = [
            'establishment_type', 'establishment_count', 'tourism_license', 'health_certificate',
            'food_handling_certificate', 'star_rating', 'cuisine_types', 'room_count',
            'table_count', 'management_style', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class HostOnboardingSerializer(serializers.Serializer):
    """
    Serializer for host onboarding process
    """
    host_type = serializers.ChoiceField(choices=User.HostType.choices, write_only=True)
    
    # Basic information
    property_name = serializers.CharField(max_length=200, required=False)
    establishment_name = serializers.CharField(max_length=200, required=False)
    contact_person = serializers.CharField(max_length=100, required=False)
    host_name = serializers.CharField(max_length=100, required=False)
    email = serializers.EmailField(required=False)
    phone = serializers.CharField(max_length=20, required=False)
    website = serializers.URLField(required=False)
    
    # Location
    address = serializers.CharField(max_length=255, required=False)
    city = serializers.CharField(max_length=100, required=False)
    state = serializers.CharField(max_length=100, required=False)
    country = serializers.CharField(max_length=100, required=False)
    postal_code = serializers.CharField(max_length=20, required=False)
    
    # Property details
    property_description = serializers.CharField(required=False)
    property_type = serializers.CharField(max_length=50, required=False)
    room_count = serializers.IntegerField(required=False)
    guest_capacity = serializers.IntegerField(required=False)
    bathroom_count = serializers.IntegerField(required=False)
    property_size = serializers.IntegerField(required=False)
    property_age = serializers.IntegerField(required=False)
    
    # Amenities and features (accept JSON strings from multipart)
    amenities = serializers.JSONField(required=False)
    property_features = serializers.JSONField(required=False)
    safety_features = serializers.JSONField(required=False)
    
    # Hosting preferences
    guest_interaction_level = serializers.CharField(max_length=50, required=False)
    property_management_style = serializers.CharField(max_length=50, required=False)
    house_rules = serializers.CharField(required=False)
    check_in_time = serializers.TimeField(required=False)
    check_out_time = serializers.TimeField(required=False)
    
    # Business details
    description = serializers.CharField(required=False)
    business_license = serializers.CharField(max_length=100, required=False)
    tourism_license = serializers.CharField(max_length=100, required=False)
    
    # Files and photos
    photos = serializers.ListField(child=serializers.FileField(), required=False)
    
    def create(self, validated_data):
        """
        Create host profile based on host type
        """
        user = self.context['user']
        host_type = validated_data['host_type']
        
        if host_type == User.HostType.HOTEL_RESTAURANT_HOST:
            profile = HotelRestaurantHostProfile.objects.create(
                user=user,
                establishment_type=validated_data.get('establishment_type', 'hotel'),
                establishment_count=validated_data.get('establishment_count', 1),
                tourism_license=validated_data.get('tourism_license', ''),
                star_rating=validated_data.get('star_rating'),
                cuisine_types=validated_data.get('cuisine_types', []),
                room_count=validated_data.get('room_count', 0),
                table_count=validated_data.get('table_count', 0),
                management_style=validated_data.get('management_style', 'owner_managed')
            )
        elif host_type == User.HostType.BNB_HOST:
            profile = BnBHostProfile.objects.create(
                user=user,
                property_count=validated_data.get('room_count', 1),
                max_properties=validated_data.get('guest_capacity', 5),
                home_sharing_license=validated_data.get('business_license', ''),
                property_management_style=validated_data.get('property_management_style', 'self_managed'),
                guest_interaction_level=validated_data.get('guest_interaction_level', 'moderate')
            )
        return profile
