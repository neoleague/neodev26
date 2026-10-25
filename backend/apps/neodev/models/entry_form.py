from django.db import models


class EntryForm(models.Model):

    timestamp = models.DateTimeField(auto_now_add=True)

    user = models.OneToOneField(
        'accounts.CustomUser',
        on_delete=models.CASCADE,
        related_name='entry_form',
    )

    question1 = models.CharField(max_length=1000)
    question2 = models.CharField(max_length=1000)
    question3 = models.CharField(max_length=1000)

    admin_comments = models.TextField(default='')

    class Statuses(models.TextChoices):
        UNREVIEWED = 'Unreviewed'
        DENIED = 'Denied'
        WAITLIST = 'Waitlist'
        ACCEPTED = 'Accepted'

    status = models.CharField(max_length=20, choices=Statuses.choices, default=Statuses.UNREVIEWED)

    def __str__(self):
        return f"Entry form - {self.user.username}"

    class Meta:
        app_label = 'neodev'