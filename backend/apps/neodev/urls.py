from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.neodev import views as neodev_views

router = DefaultRouter()
router.register(r'entry_form', neodev_views.EntryForm, basename='entry_form')

urlpatterns = [
    path('', neodev_views.DefaultPage.as_view(), name='default_page'),
    path('health/', neodev_views.HealthCheck.as_view(), name='health_check'),
    path('api/', include(router.urls)),
]