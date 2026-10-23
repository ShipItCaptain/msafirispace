"""
Django settings for msafiri project.
"""

import base64
import hashlib
import os
from pathlib import Path
from decouple import config
import dj_database_url

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY', default='django-insecure-change-in-production')

# Key for encrypting sensitive uploaded documents (KYC/ID/permits) at rest --
# see msafiri/encrypted_storage.py. Defaults to a key derived from
# SECRET_KEY so local dev works out of the box; production should set
# FILE_ENCRYPTION_KEY explicitly (generate with
# `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`)
# so rotating SECRET_KEY doesn't also lock out previously-uploaded documents.
FILE_ENCRYPTION_KEY = config(
    'FILE_ENCRYPTION_KEY',
    default=base64.urlsafe_b64encode(hashlib.sha256(SECRET_KEY.encode()).digest()).decode(),
)

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1').split(',')

# Application definition
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'drf_spectacular',
    'corsheaders',
    'django_filters',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'cloudinary_storage',
    'django_celery_beat',
    'django_celery_results',
    # 'drf_yasg',  # Temporarily disabled due to compatibility issues
]

LOCAL_APPS = [
    'apps.users',
    'apps.listings',
    'apps.bookings',
    'apps.payments',
    'apps.reviews',
    'apps.promotions',
    'apps.notifications',
    'apps.messaging',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'msafiri.middleware.RequestIDMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',
]

ROOT_URLCONF = 'msafiri.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'msafiri.wsgi.application'

# Database
DATABASES = {
    'default': dj_database_url.config(
        default=config('DATABASE_URL', default='sqlite:///db.sqlite3'),
        conn_max_age=600,
    )
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom User Model
AUTH_USER_MODEL = 'users.User'

# Site ID for allauth
SITE_ID = 1

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'EXCEPTION_HANDLER': 'msafiri.exception_handler.msafiri_exception_handler',
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
        'otp_resend': '5/hour',
        'login': '10/hour'
    }
}

# drf-spectacular settings
SPECTACULAR_SETTINGS = {
    'TITLE': 'Msafiri Space API',
    'DESCRIPTION': 'Hospitality marketplace API for hotels, restaurants, and BnBs',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# JWT Settings
from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': False,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    'JTI_CLAIM': 'jti',
}

# CORS Settings
from corsheaders.defaults import default_headers

CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:3000,http://127.0.0.1:3000'
).split(',')

# Optional, development-only origins (for example, a temporary Cloudflare
# preview tunnel). Keep this empty by default so production remains explicit.
CORS_ALLOWED_ORIGIN_REGEXES = [
    origin for origin in config('CORS_ALLOWED_ORIGIN_REGEXES', default='').split(',')
    if origin
]

CORS_ALLOW_CREDENTIALS = True
CORS_EXPOSE_HEADERS = ['X-Request-ID']
CORS_ALLOW_HEADERS = list(default_headers) + [
    'X-Request-ID',
]

# Cache Configuration -- shared, not per-process local memory. This matters
# beyond general caching: DRF's rate throttles read/write this same cache, so
# under gunicorn with multiple workers, LocMemCache gave each worker its own
# counter and silently multiplied the configured rate limits.
#
# CACHE_BACKEND=database uses Postgres instead of Redis -- for shared hosting
# (Namecheap cPanel plans don't offer Redis at all), where it's still shared
# across workers correctly, just slower than Redis. Requires a one-time
# `python manage.py createcachetable` before first use.
CACHE_BACKEND = config('CACHE_BACKEND', default='redis')
if CACHE_BACKEND == 'database':
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.db.DatabaseCache',
            'LOCATION': 'django_cache_table',
        }
    }
else:
    REDIS_URL = config('REDIS_URL', default='redis://127.0.0.1:6379/0')
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': REDIS_URL,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            },
        }
    }

# Cloudinary Configuration
CLOUDINARY_STORAGE = {
    'CLOUD_NAME': config('CLOUDINARY_CLOUD_NAME', default=''),
    'API_KEY': config('CLOUDINARY_API_KEY', default=''),
    'API_SECRET': config('CLOUDINARY_API_SECRET', default=''),
}

# Media storage backend:
# - Local filesystem in development
# - Cloudinary in production (or when explicitly enabled)
USE_CLOUDINARY_STORAGE = config('USE_CLOUDINARY_STORAGE', default=(not DEBUG), cast=bool)
STORAGES = {
    'default': {
        'BACKEND': (
            'cloudinary_storage.storage.MediaCloudinaryStorage'
            if USE_CLOUDINARY_STORAGE
            else 'django.core.files.storage.FileSystemStorage'
        )
    },
    'staticfiles': {
        'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'
    },
}

# Email Configuration
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='dev@msafirispace.local')
SITE_URL = config('SITE_URL', default='http://localhost:3000')

# OTP / signup verification code settings
OTP_CODE_LENGTH = config('OTP_CODE_LENGTH', default=6, cast=int)
OTP_EXPIRY_MINUTES = config('OTP_EXPIRY_MINUTES', default=10, cast=int)
OTP_MAX_ATTEMPTS = config('OTP_MAX_ATTEMPTS', default=5, cast=int)
OTP_RESEND_COOLDOWN_SECONDS = config('OTP_RESEND_COOLDOWN_SECONDS', default=60, cast=int)
# Phone/WhatsApp OTP delivery backend. 'console' (default) just logs the
# code -- safe for local dev. 'whatsapp_web' sends through the pilot
# whatsapp-service (see services/otp.py WhatsAppWebOTPSender and
# ../whatsapp-service/README.md). This is the kill switch: set back to
# 'console' to instantly stop real WhatsApp sends without touching code.
OTP_SENDER_BACKEND = config('OTP_SENDER_BACKEND', default='console')
WHATSAPP_SERVICE_URL = config('WHATSAPP_SERVICE_URL', default='http://127.0.0.1:4001')
WHATSAPP_SERVICE_TOKEN = config('WHATSAPP_SERVICE_TOKEN', default='')

# Booking hold / host-response SLA. A pending booking (host_approval_status
# still PENDING) soft-locks its dates until whichever of these applies:
# the short window when we have real day-level availability data to check
# instantly (calendar_verified=True), the longer one when there's no
# calendar data at all and the host has to be asked directly. Checked
# lazily at read/validation time (see Booking.is_hold_expired) rather than
# by a scheduled task -- celery/django-celery-beat are already installed
# (see requirements.txt) but not wired up; if the product ever needs the
# booking to actively flip to CANCELLED and notify the guest the moment it
# expires rather than just stopping it from blocking new bookings, that's
# the upgrade path.
BOOKING_HOLD_MINUTES = config('BOOKING_HOLD_MINUTES', default=30, cast=int)
BOOKING_HOST_RESPONSE_SLA_HOURS = config('BOOKING_HOST_RESPONSE_SLA_HOURS', default=2, cast=int)

# Celery Configuration (disabled for development)
# CELERY_BROKER_URL = REDIS_URL
# CELERY_RESULT_BACKEND = REDIS_URL
# CELERY_ACCEPT_CONTENT = ['json']
# CELERY_TASK_SERIALIZER = 'json'
# CELERY_RESULT_SERIALIZER = 'json'
# CELERY_TIMEZONE = TIME_ZONE

# Payment Gateway Settings
MPESA_CONSUMER_KEY = config('MPESA_CONSUMER_KEY', default='')
MPESA_CONSUMER_SECRET = config('MPESA_CONSUMER_SECRET', default='')
MPESA_PASSKEY = config('MPESA_PASSKEY', default='')
MPESA_SHORTCODE = config('MPESA_SHORTCODE', default='')
MPESA_ENVIRONMENT = config('MPESA_ENVIRONMENT', default='sandbox')
# Comma-separated Safaricom callback source IPs. Empty = no IP filtering (the
# Daraja go-live application, Day 7, is what supplies the real list).
MPESA_WEBHOOK_ALLOWED_IPS = [
    ip.strip() for ip in config('MPESA_WEBHOOK_ALLOWED_IPS', default='').split(',') if ip.strip()
]

# Paystack Configuration
PAYSTACK_PUBLIC_KEY = config('PAYSTACK_PUBLIC_KEY', default='')
PAYSTACK_SECRET_KEY = config('PAYSTACK_SECRET_KEY', default='')
PAYSTACK_ENVIRONMENT = config('PAYSTACK_ENVIRONMENT', default='test')
WEBHOOK_TEST_TOKEN = config('WEBHOOK_TEST_TOKEN', default='')

# Security Settings

# Set unconditionally, not just under `if not DEBUG` below: this only takes
# effect when the specific X-Forwarded-Proto header is actually present, so
# it's a no-op locally (nothing sends that header in dev) but is required
# once this sits behind any reverse proxy/load balancer in production --
# otherwise Django can't tell a proxied HTTPS request from plain HTTP, which
# breaks SECURE_SSL_REDIRECT and secure cookies below (redirect loops, or
# cookies silently never getting set).
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_REDIRECT_EXEMPT = []
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    X_FRAME_OPTIONS = 'DENY'

# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
            'formatter': 'verbose',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
}

# Create logs directory if it doesn't exist
os.makedirs(BASE_DIR / 'logs', exist_ok=True)
