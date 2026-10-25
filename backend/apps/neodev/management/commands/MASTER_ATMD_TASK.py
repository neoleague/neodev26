from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone
import subprocess


class Command(BaseCommand):

    '''
    One command to rule them all.
    Allows all the other automated commands to be run from just this one.
    This is done to save me money on cron jobs.
    '''

    help = '''
    One command to rule them all.
    Allows all the other automated commands to be run from just this one.
    This is done to save me money on cron jobs.
    '''

    def add_arguments(self, parser):

        parser.add_argument(
            '--force',
            action='store_true',
            help='Force all tasks to run immediately, skipping time checks.'
        )

    def handle(self, *args, **options):

        forced = options['force']

        now = timezone.now()
        freq = settings.MAIN_CRON_JOB_FREQ
        total_minutes = int(now.timestamp() // 60)

        self.stdout.write(self.style.NOTICE(f"Master task started. Running automated tasks..."))
        if forced:
            self.stdout.write('Since --force was used, ALL tasks will be executed')
        else:
            self.stdout.write('This is considering timescales, meaning not all functions will be run.')
        self.stdout.write('')

        # Hourly processes
        if forced or total_minutes % 60 < freq:
            pass

        # Daily commands
        if forced or total_minutes % 1440 < freq:
            pass