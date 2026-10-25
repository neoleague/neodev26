from django.apps import AppConfig
from django.contrib import admin


class NeodevConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.neodev'
    app_label = 'neodev'