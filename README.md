NEODEV 2026 REPO!!!

**Local backend setup:**

(powershell)
Start in `root`
> \> python -m venv .venv 
> \> .venv/scripts/Activate.ps1
> \> cd backend
> \> pip install -r requirements.txt
> \> python manage\.py runserver

To add a superuser (admin) account:

(powershell)
Start in `root/backend`

> \> python manage\.py createsuperuser

Follow the prompts, when typing your password it will be invisible.