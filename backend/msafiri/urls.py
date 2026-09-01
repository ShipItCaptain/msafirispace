"""
URL configuration for msafiri project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse
from rest_framework import permissions
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

# API Schema for Swagger Documentation
# schema_view = get_schema_view(
#     openapi.Info(
#         title="Msafiri Space API",
#         default_version='v1',
#         description="Hospitality marketplace API for hotels, restaurants, and BnBs",
#         terms_of_service="https://www.msafirispace.com/terms/",
#         contact=openapi.Contact(email="api@msafirispace.com"),
#         license=openapi.License(name="MIT License"),
#     ),
#     public=True,
#     permission_classes=(permissions.AllowAny,),
# )

urlpatterns = [
    # Django Admin
    path('admin/', admin.site.urls),
    
    # Simple root URL for testing
    path('', lambda request: HttpResponse("Msafiri Space API is running! 🚀")),
    
    # API Documentation (drf-spectacular)
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # API Endpoints
    path('api/v1/', include([
        # Authentication
        path('auth/', include('apps.users.urls')),
        
        # Core Features
        path('listings/', include('apps.listings.urls')),
        path('bookings/', include('apps.bookings.urls')),
        path('payments/', include('apps.payments.urls')),
        path('reviews/', include('apps.reviews.urls')),
        path('promotions/', include('apps.promotions.urls')),
        # path('referrals/', include('apps.referrals.urls')),
        path('notifications/', include('apps.notifications.urls')),
        path('messaging/', include('apps.messaging.urls')),
    ])),
    
    # Allauth URLs (for social authentication)
    path('accounts/', include('allauth.urls')),
]

# Serve static and media files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Custom Admin Site Configuration
admin.site.site_header = "Msafiri Space Administration"
admin.site.site_title = "Msafiri Space Admin"
admin.site.index_title = "Welcome to Msafiri Space Administration"
