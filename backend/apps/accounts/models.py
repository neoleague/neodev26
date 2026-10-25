from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    # The main user model.
    
    # all of the following are additional parameters on top of the existing ones:

    # username: Required. 150 characters or fewer. Used for unique identification.
    # first_name: Optional (blank=True). Maximum 150 characters.
    # last_name: Optional (blank=True). Maximum 150 characters.
    # email: Optional (blank=True) by default, though often made mandatory in custom models.
    # password: Required string hash of the user's password.
    # is_staff: Boolean; determines if the user can access the Django admin site.
    # is_active: Boolean; recommended over deleting accounts to preserve data integrity.
    # is_superuser: Boolean; grants all permissions without explicitly assigning them.
    # last_login: Datetime of the user's last successful login.
    # date_joined: Datetime designating when the account was created.

    # vvV Custom fields Vvv

    bio = models.TextField(max_length=500, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)