import types
from django.contrib import admin
from django.urls import path
from django.template.response import TemplateResponse

# 1. Define your custom view handlers
def request_tester_view(self, request):
    context = dict(self.each_context(request), title="Request Tester")
    return TemplateResponse(request, "admin/williams_tools/request_tester.html", context)

def table_downloader_view(self, request):
    context = dict(self.each_context(request), title="Table Downloader")
    return TemplateResponse(request, "admin/williams_tools/table_downloader.html", context)

# 2. Store original methods so we can extend them
original_get_urls = admin.site.get_urls
original_get_app_list = admin.site.get_app_list

# 3. Create extended methods
def custom_get_urls(self):
    urls = original_get_urls()
    custom_urls = [
        path(
            'williams-tools/request-tester/', 
            self.admin_view(lambda req: request_tester_view(self, req)), 
            name='request_tester'
        ),
        path(
            'williams-tools/table-downloader/', 
            self.admin_view(lambda req: table_downloader_view(self, req)), 
            name='table_downloader'
        ),
    ]
    return custom_urls + urls

def custom_get_app_list(self, request, app_label=None):
    app_list = original_get_app_list(request, app_label)
    
    if app_label is None:
        wtadmin_custom_app = {
            'name': 'Williams Tools',
            'app_label': 'williams_tools',
            'app_url': '#',
            'has_module_perms': True,
            'models': [
                {
                    'name': 'Request Tester',
                    'object_name': 'request_tester',
                    'admin_url': 'williams-tools/request-tester/',
                    'view_only': True,
                    'perms': {'view': True},
                },
                {
                    'name': 'Table Downloader',
                    'object_name': 'table_downloader',
                    'admin_url': 'williams-tools/table-downloader/',
                    'view_only': True,
                    'perms': {'view': True},
                }
            ]
        }
        app_list.append(wtadmin_custom_app)
        
    return app_list

# 4. Attach the methods to the existing instance without replacing it!
admin.site.get_urls = types.MethodType(custom_get_urls, admin.site)
admin.site.get_app_list = types.MethodType(custom_get_app_list, admin.site)