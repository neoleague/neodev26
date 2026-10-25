import csv
import io
import json
from typing import List
from django.core.serializers.json import DjangoJSONEncoder

from ...williams_tools import services as wt_services


def get_ordered_fields(field_names: List[str]) -> List[str]:
    """
    Sorts fields alphabetically, placing 'id' first if present.
    """
    has_id = 'id' in field_names
    other_fields = sorted([f for f in field_names if f != 'id'])
    return ['id'] + other_fields if has_id else other_fields


def queryset_to_json(queryset, fields: List[str] = None) -> str:
    """Serializes a queryset and returns a raw JSON string with ordered keys and rows."""
    model_class = queryset.model
    
    # Accept user-selected fields or fall back to model defaults
    if not fields:
        fields = [
            field.get_accessor_name() if field.auto_created and not field.concrete else getattr(field, 'name', None)
            for field in model_class._meta.get_fields()
        ]
        fields = [f for f in fields if f]

    ordered_fields = get_ordered_fields(fields)
    
    # Sort rows by the first column in ordered_fields (e.g., 'id' if present, else first alphabetical field)
    if ordered_fields:
        first_column = ordered_fields[0]
        queryset = queryset.order_by(first_column)

    optimized_qs = wt_services.optimize_queryset(queryset)
    
    # Retrieve serialized data from DRF
    serializer_class = wt_services.get_super_serializer(model_class=model_class)
    serializer = serializer_class(optimized_qs, many=True)
    raw_data = serializer.data

    # Enforce key insertion order (Python 3.7+ dicts preserve key order)
    ordered_data = []
    for item in raw_data:
        ordered_item = {field: item.get(field) for field in ordered_fields if field in item}
        ordered_data.append(ordered_item)

    return json.dumps(ordered_data, cls=DjangoJSONEncoder, indent=4)


def queryset_to_csv(queryset, fields: List[str] = None) -> str:
    """Serializes a queryset and returns a raw CSV string with ordered columns and rows."""
    model = queryset.model
    output = io.StringIO()
    writer = csv.writer(output)
    
    if not fields:
        fields = [
            field.get_accessor_name() if field.auto_created and not field.concrete else getattr(field, 'name', None)
            for field in model._meta.get_fields()
        ]
        fields = [f for f in fields if f]

    # Enforce 'id' first, then alphabetical sort
    ordered_fields = get_ordered_fields(fields)
    
    # Sort rows by the first column in ordered_fields
    if ordered_fields:
        first_column = ordered_fields[0]
        queryset = queryset.order_by(first_column)

    # Write Header Row
    writer.writerow(ordered_fields)
    
    serializer_class = wt_services.get_super_serializer(model_class=model)
    optimized_qs = wt_services.optimize_queryset(queryset)
    serialized_data = serializer_class(optimized_qs, many=True).data
    
    # Process rows using the exact ordered_fields list
    for item in serialized_data:
        row = []
        for field in ordered_fields:
            value = item.get(field)
            
            if value is None:
                value = ""
            elif isinstance(value, list):
                value = ", ".join(map(str, value))
            elif isinstance(value, dict):
                value = json.dumps(value, cls=DjangoJSONEncoder)
            
            row.append(value)
            
        writer.writerow(row)
        
    return output.getvalue()