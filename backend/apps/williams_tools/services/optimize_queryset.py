from django.db.models import QuerySet, ForeignKey, OneToOneField, ManyToManyField


def optimize_queryset(queryset: QuerySet) -> QuerySet:
    """
    Accepts an existing queryset, automatically applies select_related 
    and prefetch_related for valid forward and explicit reverse relationships.
    """
    model_class = queryset.model

    select_fields = []
    prefetch_fields = []

    for field in model_class._meta.get_fields():
        # Handle reverse relationships (e.g., ManyToOneRel, ManyToManyRel)
        if field.auto_created and not field.concrete:
            # Skip hidden relations (e.g. related_name='+') or fields without accessors
            if getattr(field, 'is_hidden', lambda: False)() or not hasattr(field, 'get_accessor_name'):
                continue
            
            accessor_name = field.get_accessor_name()
            # Verify the descriptor actually exists as a manager/property on the model class
            if hasattr(model_class, accessor_name):
                prefetch_fields.append(accessor_name)
            continue

        # Forward Foreign Keys and One-to-Ones
        if isinstance(field, (ForeignKey, OneToOneField)):
            select_fields.append(field.name)

        # Forward Many-to-Many
        elif isinstance(field, ManyToManyField):
            prefetch_fields.append(field.name)

    if select_fields:
        queryset = queryset.select_related(*select_fields)
    if prefetch_fields:
        queryset = queryset.prefetch_related(*prefetch_fields)
    
    return queryset