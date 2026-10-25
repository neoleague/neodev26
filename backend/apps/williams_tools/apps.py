from django.apps import AppConfig
from django.conf import settings
from django.urls import path, include
import importlib
from pathlib import Path
import sys


class URLProxy:
    """Wraps the original config.urls module to intercept 'urlpatterns' access."""

    def __init__(self, original_module, app_urls):
        self._original_module = original_module
        self._app_urls = app_urls

    def __getattr__(self, name):
        # Fetch attribute from the real config/urls.py file
        attr = getattr(self._original_module, name)
        
        # If reading urlpatterns, intercept and inject our own urls
        if name == 'urlpatterns':
            if isinstance(attr, list) and not any(getattr(p, 'app_name', None) == 'williams-tools' for p in attr):
                attr.append(self._app_urls)

        return attr


class WilliamsToolsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'

    app_dir = Path(__file__).resolve().parent
    name = ".".join(app_dir.relative_to(settings.BASE_DIR).parts)
    
    app_label = 'williams_tools'

    def ready(self):
        drf_settings = getattr(settings, 'REST_FRAMEWORK', {})


        # Inject exception handler

        drf_default = 'rest_framework.views.exception_handler'
        current_handler = drf_settings.get('EXCEPTION_HANDLER')

        # Only overwrite it if it's empty, or still set to the DRF default.
        if current_handler is None:
            drf_settings['EXCEPTION_HANDLER'] = WilliamsToolsConfig.name + '.exceptions.global_django_exception_handler'
            setattr(settings, 'REST_FRAMEWORK', drf_settings)

        # make my admin site stuff work hopefully
        try:
            importlib.import_module(f"{WilliamsToolsConfig.name}.admin_site")
        except ImportError as e:
            print(f"Failed to load williams_tools admin: {e}")