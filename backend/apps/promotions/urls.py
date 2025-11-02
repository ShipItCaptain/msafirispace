from django.urls import path
from .views import (
    PromotionListCreateView,
    PromotionDetailView,
    active_promotions,
    track_promotion_view,
    track_promotion_click,
    PromotionSlotListCreateView,
    PromotionSlotDetailView
)

app_name = 'promotions'

urlpatterns = [
    # Promotions
    path('', PromotionListCreateView.as_view(), name='promotion-list-create'),
    path('<int:pk>/', PromotionDetailView.as_view(), name='promotion-detail'),
    path('active/<str:promotion_type>/', active_promotions, name='active-promotions'),
    path('<int:promotion_id>/track-view/', track_promotion_view, name='track-promotion-view'),
    path('<int:promotion_id>/track-click/', track_promotion_click, name='track-promotion-click'),
    
    # Promotion Slots
    path('slots/', PromotionSlotListCreateView.as_view(), name='promotion-slot-list-create'),
    path('slots/<int:pk>/', PromotionSlotDetailView.as_view(), name='promotion-slot-detail'),
]
