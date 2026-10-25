from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.neodev import models as neodev_models
from apps.neodev import serializers as neodev_serializers


class EntryForm(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = neodev_serializers.EntryForm

    def get_queryset(self):
        return neodev_models.EntryForm.objects.filter(user=self.user)