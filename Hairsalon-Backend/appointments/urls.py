from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AvailabilityViewSet, AppointmentViewSet, ChatViewSet, MessageViewSet,
    chatbot_view, ai_tryon_view, validate_hairstyle_view
)

router = DefaultRouter()
router.register(r'availability', AvailabilityViewSet, basename='availability')
router.register(r'appointments', AppointmentViewSet, basename='appointment')
router.register(r'chats', ChatViewSet, basename='chat')
router.register(r'messages', MessageViewSet, basename='message')

urlpatterns = [
    path('chatbot/', chatbot_view, name='chatbot'),
    path('ai/try-on/', ai_tryon_view, name='ai_tryon'),
    path('ai/validate-hairstyle/', validate_hairstyle_view, name='validate_hairstyle'),
    path('', include(router.urls)),
]
