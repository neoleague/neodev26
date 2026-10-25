from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from nested_admin import NestedModelAdmin
from apps.accounts.models import CustomUser

@admin.register(CustomUser)
class CustomUserAdmin(NestedModelAdmin, UserAdmin):
    fieldsets = (
        (None, {
            'fields': ('username', 'password', 'id')
        }),
        ('Personal info', {
            'fields': ('first_name', 'last_name', 'email')
        }),
        ('Profile', {
            'fields': ('bio', 'birth_date', 'phone')
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
            }),
        ('Important dates', {
            'fields': ('last_login', 'date_joined')
        }),
    )

    search_fields = ('username', 'email')

    readonly_fields = ('date_joined', 'id')
    inlines = []