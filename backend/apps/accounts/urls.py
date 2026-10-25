from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenBlacklistView

from .views import RegisterView, MeView, UpdateProfileView

urlpatterns = [
    path('api/auth/register/', RegisterView.as_view(), name='auth_register'),
    path('api/auth/login/', TokenObtainPairView.as_view(), name='auth_token_login'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='auth_token_refresh'),
    path('api/auth/logout/', TokenBlacklistView.as_view(), name='auth_token_blacklist'),
    path('api/auth/me/', MeView.as_view(), name='auth_me'),
    path('api/auth/profile/', UpdateProfileView.as_view(), name='auth_profile'),
]
