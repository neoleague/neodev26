from django.urls import reverse
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

class DefaultPage(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        admin_url = reverse('admin:index')
        return HttpResponse(f'The Neodev backend is up. <br></br> <a href="{admin_url}">Go to admin dashboard</a>')


class HealthCheck(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return HttpResponse('OK', status=200)