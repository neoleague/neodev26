from django.apps import apps
from django.http import HttpResponse
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from ...williams_tools import serializers as wt_serializers
from ...williams_tools import services as wt_services

class AdminDataInspector(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        
        """
        Returns structural details about all models in the database,
        grouped by app and model name.
        """

        database_schema = []

        for model_class in apps.get_models():
            app_label = model_class._meta.app_label
            model_name = model_class._meta.model_name
            verbose_name = model_class._meta.verbose_name.title()

            field_names = []
            for field in model_class._meta.get_fields():
                # If it's a reverse relation, get the related name (e.g., 'employee_set')
                if field.auto_created and not field.concrete:
                    name = field.get_accessor_name()
                else:
                    name = getattr(field, 'name', None)
                
                if name:
                    field_names.append(name)

            model_details = {
                "app": app_label,
                "model": model_name,
                "display_name": verbose_name,
                "fields": field_names,
            }
            database_schema.append(model_details)

        return Response(database_schema)

    def post(self, request):

        """
        Returns a table of the database as a file.

        Required request fields:
        - app
        - model

        Optional:
        - fields to include
        - filters
        - filetype (either 'json' or 'csv', defaults to json)
        - browser_download (bool, defaults to True)
        """

        input_serializer = wt_serializers.AdminDataInspector(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        validated_data = input_serializer.validated_data
        model_class = validated_data['model_class']
        fields = validated_data['fields']
        filters = validated_data['filters']
        filetype = validated_data['filetype']
        browser_download = validated_data['browser_download']

        queryset = model_class.objects.filter(**filters)

        DOWNLOAD_CONFIG = {
            'json': {
                'func': wt_services.queryset_to_json,
                'content_type': 'application/json',
                'extension': 'json'
            },
            'csv': {
                'func': wt_services.queryset_to_csv,
                'content_type': 'text/csv',
                'extension': 'csv'
            }
        }

        config = DOWNLOAD_CONFIG[filetype]
        # Pass 'fields' down to the updated service
        file_content_string = config['func'](queryset, fields=fields)

        response = HttpResponse(file_content_string, content_type=config['content_type'])
        
        if browser_download:
            filename = f"{model_class._meta.model_name}_export.{config['extension']}"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'

        return response