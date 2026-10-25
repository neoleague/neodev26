from rest_framework import serializers
from django.apps import apps
from django.core.exceptions import FieldError

class AdminDataInspector(serializers.Serializer):

    FILETYPE_CHOICES = ['json', 'csv']

    model = serializers.CharField(required=True)
    app = serializers.CharField(required=True)
    fields = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )
    filters = serializers.DictField(required=False, default=dict)
    filetype = serializers.ChoiceField(choices=FILETYPE_CHOICES, required=False, default='json')
    browser_download = serializers.BooleanField(required=False, default=True)

    def validate(self, data):
        app_label = data['app']
        model_name = data['model']
        filters = data['filters']
        
        try:
            model_class = apps.get_model(app_label=app_label, model_name=model_name)
            data['model_class'] = model_class
        except LookupError:
            raise serializers.ValidationError({
                "model": f"Model '{model_name}' inside app '{app_label}' does not exist."
            })
        
        try:
            model_class.objects.filter(**filters).query.chain()
        except FieldError as e:
            raise serializers.ValidationError({
                "filters": str(e)
            })
            
        return data