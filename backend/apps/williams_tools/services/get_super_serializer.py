from django.db.models import Model
from rest_framework import serializers
from typing import Type, TypeVar


_M = TypeVar("_M", bound=Model)

def get_super_serializer(*, model_class: Type[_M]) -> Type[serializers.ModelSerializer]:

    """
    Returns a serializer for ALL fields of the specified model
    """

    class SuperSerializerClass(serializers.ModelSerializer):
        class Meta:
            model = model_class
            fields = '__all__'

    return SuperSerializerClass