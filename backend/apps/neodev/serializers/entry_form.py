from rest_framework import serializers

from apps.neodev import models as neodev_models


class EntryForm(serializers.ModelSerializer):
    class Meta:
        model = neodev_models.EntryForm
        fields = ['id', 'timestamp', 'user', 'question1', 'question2', 'question3', 'status']
        read_only_fields = ['id', 'timestamp', 'user', 'status']