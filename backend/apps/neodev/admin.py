from django.contrib import admin
from django.utils.html import format_html
from apps.neodev.models import EntryForm


# Admin site customization
admin.site.site_header = "Neodev Administration"
admin.site.site_title = "Neodev Admin Portal"
admin.site.index_title = "Welcome to Neodev Dashboard"


# Models
@admin.register(EntryForm)
class EntryFormAdmin(admin.ModelAdmin):
    # Columns shown in the main table list view
    list_display = ('user', 'colored_status', 'timestamp', 'short_q1', 'short_q2')
    
    # Clickable fields to open the detail page
    list_display_links = ('user',)
    
    # Filter sidebar on the right side
    list_filter = ('status', 'timestamp')
    
    # Search bar targets username, email, and the answers given
    search_fields = ('user__username', 'user__email', 'question1', 'question2', 'question3')
    
    # Speeds up loading by using an autocomplete dropdown for users instead of a massive select menu
    autocomplete_fields = ('user',)
    
    # Read-only fields to prevent staff from altering timestamps
    readonly_fields = ('timestamp',)
    
    # Form layout styling inside the entry detail view
    fieldsets = (
        ('Submission Info', {
            'fields': ('user', 'timestamp')
        }),
        ('Form Content', {
            'fields': ('question1', 'question2', 'question3')
        }),
        ('Review & Administration', {
            'fields': ('status', 'admin_comments'),
            'classes': ('collapse-open',),  # Keeps this section visible by default
        }),
    )

    # 1. Adds pretty badge colors to the status column in the list view
    @admin.display(description='Status', ordering='status')
    def colored_status(self, obj):
        colors = {
            'Unreviewed': '#6c757d',
            'Denied': '#dc3545',
            'Waitlist': '#ffc107',
            'Accepted': '#198754',
        }
        color = colors.get(obj.status, '#000000')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 12px; font-weight: bold; font-size: 11px;">{}</span>',
            color, obj.status
        )

    # 2. Snippet limits so long text answers don't blow up the list table width
    @admin.display(description='Q1 Preview')
    def short_q1(self, obj):
        return obj.question1[:50] + "..." if len(obj.question1) > 50 else obj.question1

    @admin.display(description='Q2 Preview')
    def short_q2(self, obj):
        return obj.question2[:50] + "..." if len(obj.question2) > 50 else obj.question2