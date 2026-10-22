"""
Create a scoped service account for a server-to-server API consumer (e.g. an
AI concierge bot) -- a normal guest-role user, created and verified directly
instead of going through the OTP signup flow (which assumes a human who can
receive an email/WhatsApp code).

A "service account" here is deliberately nothing special in the permission
system: it's a plain guest account, which is already exactly the access
level a booking bot needs (search listings, create bookings, create payment
intents) and nothing more -- it can't touch host tools, Django admin, or
other users' data, the same as any guest. No new permission class needed.
"""
import secrets
import string

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

User = get_user_model()


def _generate_password(length=24):
    alphabet = string.ascii_letters + string.digits + '!@#$%^&*'
    return ''.join(secrets.choice(alphabet) for _ in range(length))


class Command(BaseCommand):
    help = 'Create (or reset) a scoped guest-role service account for an API consumer such as a bot.'

    def add_arguments(self, parser):
        parser.add_argument('--email', required=True, help='Login email for the service account.')
        parser.add_argument('--name', default='Service Account', help='Display name (first name).')
        parser.add_argument(
            '--reset-password', action='store_true',
            help='If the account already exists, issue it a new random password instead of erroring out.',
        )

    def handle(self, *args, **options):
        email = options['email'].strip().lower()
        name = options['name']
        password = _generate_password()

        user = User.objects.filter(email=email).first()
        if user is not None and not options['reset_password']:
            raise CommandError(
                f'A user with email {email} already exists. Pass --reset-password to issue it a new password.'
            )

        if user is None:
            user = User(email=email, username=email, first_name=name)

        user.set_password(password)
        user.account_verified = True  # skips the OTP gate checked at login
        user.is_active = True
        user.is_staff = False
        user.is_superuser = False
        user.save()

        self.stdout.write(self.style.SUCCESS(
            f'Service account ready: {email}\n'
            f'Password (shown once -- store it securely now): {password}\n'
            f'Role: guest (same access as any traveler account -- search, book, pay; '
            f'no host tools, no admin).\n'
            f'Authenticate via POST /api/v1/auth/login/ like any other account.'
        ))
