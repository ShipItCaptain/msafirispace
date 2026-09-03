"""
Serializers for the Users app
"""
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.utils import timezone
from .models import User, UserProfile, UserAddress, BnBHostProfile, HotelRestaurantHostProfile


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration. Registration always creates a plain
    guest account -- there is no host-signup path here. Becoming a host is
    a separate, later decision made through the host onboarding wizard
    (see HostOnboardingSerializer), which is also where KYC/business
    details (company name, KRA PIN, permits, etc.) actually get collected.
    """
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    referral_code = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'email', 'username', 'first_name', 'last_name', 'password', 'password_confirm',
            'phone_number', 'referral_code'
        ]
        extra_kwargs = {
            'username': {'required': False},
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

        return attrs

    def create(self, validated_data):
        # Remove password_confirm from validated data
        validated_data.pop('password_confirm')
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

        # Every new account starts as a plain guest -- roles/active_role
        # already default to guest on the model, nothing else to set here.
        user.save()

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
            'property_management_style', 'guest_interaction_level',
            'account_type', 'owner_name', 'owner_kra_pin', 'owner_id_number',
            'owner_id_front', 'owner_id_back', 'owner_permit',
            'company_name', 'company_kra_pin', 'company_permit',
            'contact_email', 'contact_phone', 'onboarding_completed_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'onboarding_completed_at']


class HotelRestaurantHostProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for Hotel/Restaurant Host Profile
    """
    class Meta:
        model = HotelRestaurantHostProfile
        fields = [
            'establishment_type', 'establishment_count', 'tourism_license', 'health_certificate',
            'food_handling_certificate', 'star_rating', 'cuisine_types', 'room_count',
            'table_count', 'management_style',
            'company_name', 'contact_email', 'contact_phone', 'kra_pin',
            'manager_name', 'manager_contact', 'manager_role',
            'business_permit', 'business_registration_certificate', 'onboarding_completed_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'onboarding_completed_at']


class HostOnboardingSerializer(serializers.Serializer):
    """
    Serializer for the host onboarding wizard (KYC). One combined submission
    covering: account type (individual/company), host category (bnb vs
    hotel/restaurant), and the type-specific identity/business details.
    Hotel/Restaurant is always treated as a business regardless of
    account_type -- that choice only actually branches the BnB path.
    """
    account_type = serializers.ChoiceField(choices=BnBHostProfile.AccountType.choices, required=True)
    host_category = serializers.ChoiceField(choices=[('bnb', 'BnB'), ('hotel_restaurant', 'Hotel/Restaurant')], required=True)

    # BnB -- individual branch
    owner_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    owner_kra_pin = serializers.CharField(max_length=20, required=False, allow_blank=True)
    owner_id_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    owner_id_front = serializers.FileField(required=False)
    owner_id_back = serializers.FileField(required=False)
    owner_permit = serializers.FileField(required=False)

    # BnB -- company branch
    company_name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    company_kra_pin = serializers.CharField(max_length=20, required=False, allow_blank=True)
    company_permit = serializers.FileField(required=False)

    # Hotel/Restaurant (always business-style)
    kra_pin = serializers.CharField(max_length=20, required=False, allow_blank=True)
    manager_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    manager_contact = serializers.CharField(max_length=100, required=False, allow_blank=True)
    manager_role = serializers.ChoiceField(choices=[('manager', 'Manager'), ('director', 'Director')], required=False, allow_blank=True)
    business_permit = serializers.FileField(required=False)
    business_registration_certificate = serializers.FileField(required=False)

    # Shared contact (BnB uses these directly; Hotel/Restaurant also has its
    # own company_name field above, reusing contact_email/contact_phone)
    contact_email = serializers.EmailField(required=False, allow_blank=True)
    contact_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)

    # Only collected when the wizard is being completed by a signed-out
    # visitor -- the KYC details being typed here double as the account's
    # registration info, so there's no separate sign-up screen (see
    # create_account() below).
    password = serializers.CharField(write_only=True, required=False, min_length=8)

    def validate(self, attrs):
        host_category = attrs.get('host_category')
        account_type = attrs.get('account_type')
        errors = {}

        def require(field):
            if not attrs.get(field):
                errors[field] = 'This field is required.'

        if host_category == 'hotel_restaurant':
            for field in (
                'company_name', 'contact_email', 'contact_phone', 'kra_pin',
                'manager_name', 'manager_contact', 'manager_role',
                'business_permit', 'business_registration_certificate',
            ):
                require(field)
        elif host_category == 'bnb':
            if account_type == 'individual':
                for field in (
                    'owner_name', 'owner_kra_pin', 'owner_id_number',
                    'owner_id_front', 'owner_id_back', 'contact_email', 'contact_phone',
                ):
                    require(field)
                # owner_permit is optional per spec
            elif account_type == 'company':
                for field in ('company_name', 'company_kra_pin', 'company_permit', 'contact_email', 'contact_phone'):
                    require(field)

        requesting_user = self.context.get('user')
        if not (requesting_user and requesting_user.is_authenticated):
            require('password')
            contact_email = attrs.get('contact_email')
            if contact_email and User.objects.filter(email__iexact=contact_email).exists():
                errors['contact_email'] = 'An account with this email already exists. Please sign in instead.'

        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def create_account(self, validated_data):
        """
        Builds the User account itself for a signed-out visitor completing
        the wizard, reusing the KYC contact/name fields as the account's
        registration details instead of asking for them a second time.
        """
        name_source = (
            validated_data.get('owner_name')
            or validated_data.get('manager_name')
            or validated_data.get('company_name')
            or ''
        ).strip()
        first_name, _, last_name = name_source.partition(' ')
        email = validated_data['contact_email']
        user = User.objects.create_user(
            email=email,
            username=email,
            password=validated_data['password'],
            first_name=first_name,
            last_name=last_name,
            phone_number=validated_data.get('contact_phone', ''),
        )
        UserProfile.objects.create(user=user)
        return user

    def create(self, validated_data):
        user = self.context['user']
        host_category = validated_data['host_category']
        account_type = validated_data.get('account_type', '')
        now = timezone.now()

        if host_category == 'hotel_restaurant':
            profile, _ = HotelRestaurantHostProfile.objects.update_or_create(
                user=user,
                defaults={
                    'company_name': validated_data.get('company_name', ''),
                    'contact_email': validated_data.get('contact_email', ''),
                    'contact_phone': validated_data.get('contact_phone', ''),
                    'kra_pin': validated_data.get('kra_pin', ''),
                    'manager_name': validated_data.get('manager_name', ''),
                    'manager_contact': validated_data.get('manager_contact', ''),
                    'manager_role': validated_data.get('manager_role', ''),
                    'business_permit': validated_data.get('business_permit'),
                    'business_registration_certificate': validated_data.get('business_registration_certificate'),
                    'onboarding_completed_at': now,
                },
            )
        else:
            defaults = {
                'account_type': account_type,
                'contact_email': validated_data.get('contact_email', ''),
                'contact_phone': validated_data.get('contact_phone', ''),
                'onboarding_completed_at': now,
            }
            if account_type == 'individual':
                defaults.update({
                    'owner_name': validated_data.get('owner_name', ''),
                    'owner_kra_pin': validated_data.get('owner_kra_pin', ''),
                    'owner_id_number': validated_data.get('owner_id_number', ''),
                    'owner_id_front': validated_data.get('owner_id_front'),
                    'owner_id_back': validated_data.get('owner_id_back'),
                    'owner_permit': validated_data.get('owner_permit'),
                })
            else:
                defaults.update({
                    'company_name': validated_data.get('company_name', ''),
                    'company_kra_pin': validated_data.get('company_kra_pin', ''),
                    'company_permit': validated_data.get('company_permit'),
                })
            profile, _ = BnBHostProfile.objects.update_or_create(user=user, defaults=defaults)
        return profile
