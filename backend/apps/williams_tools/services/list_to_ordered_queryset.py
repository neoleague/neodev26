from django.db.models import QuerySet, Model, When, Case, IntegerField
from typing import TypeVar


_M = TypeVar("_M", bound=Model)

def list_to_ordered_queryset(*, ids:list[int], model:type[_M]) -> QuerySet:

    """
    Turn a list of ordered ID's into a queryset with the same ordering. 
    """
    
    if not ids:
        return model.objects.none()
    
    queryset = model.objects.filter(id__in=ids)

    ordering_rules = [When(id=pk, then=position) for position, pk in enumerate(ids)]

    return queryset.order_by(
        Case(*ordering_rules, output_field=IntegerField())
    )