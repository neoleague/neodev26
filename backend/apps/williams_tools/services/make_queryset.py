from collections.abc import Iterable
from django.db.models import QuerySet, Model, Q
from typing import TypeVar, Union, Set, List


_M = TypeVar("_M", bound=Model)

def make_queryset(
    input_data: Union[None, int, str, Model, QuerySet, Iterable],
    model: type[_M],
    *,
    just_ids:bool=False
) -> Union[QuerySet, Set[int]]:
    
    """
    Accepts a wide variety of datatypes and returns an unordered queryset.
    If the flag just_ids == True, returns a set of the ID's instead of the full queryset
    """

    combined_filter = Q(pk__in=[])

    if input_data is None:
        combined_filter = Q()

    elif isinstance(input_data, (int, str)):
        combined_filter = Q(id=int(input_data))
    
    elif isinstance(input_data, Iterable):
        input_data = set(input_data)
        
        collected_ids: List[int] = []
        combined_filter = Q(pk__in=[])

        for item in input_data:
            if isinstance(item, (int, str)):
                collected_ids.append(int(item))
            elif isinstance(item, model):
                collected_ids.append(item.id)
            elif isinstance(item, QuerySet) and item.model == model:
                combined_filter |= item.query.where

        if collected_ids:
            combined_filter |= Q(id__in=collected_ids)
    
    elif isinstance(input_data, model):
        combined_filter = Q(id=input_data.id)
    
    elif isinstance(input_data, QuerySet) and input_data.model == model:
        combined_filter = input_data.query.where

    else:
        raise TypeError(f"Unsupported input type: {type(input_data).__name__}")

    queryset = model.objects.filter(combined_filter)

    if just_ids:
        return set(queryset.values_list('id', flat=True))

    return queryset