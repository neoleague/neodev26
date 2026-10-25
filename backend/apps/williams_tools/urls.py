from django.urls import path, include
from rest_framework.routers import DefaultRouter
from ..williams_tools import views as wt_views

router = DefaultRouter()

urlpatterns = [
    path('', include(router.urls)),
    path('admin-data-inspector/', wt_views.AdminDataInspector.as_view(), name='admin_data_inspector')
]