"""
Create the first System-tier super admin account. There's no UI to grant
admin_tier until a System admin already exists to use it -- this command is
the one-time chicken/egg breaker, mirroring
apps.users.management.commands.create_service_account's shape.

Every admin created after this one goes through the System-tier-only
admin-management endpoint instead, so there's an auditable record (an
AdminActionLog row + admin_tier_granted_by) of who granted it -- this
command is deliberately the only path with neither.
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
    help = 'Create (or reset) the first System-tier super admin account.'

    def add_arguments(self, parser):
        parser.add_argument('--email', required=True, help='Login email for the admin account.')
        parser.add_argument('--name', default='Admin', help='Display name (first name).')
        parser.add_argument(
            '--tier', default='system', choices=[c for c, _ in User.AdminTier.choices],
            help='Admin tier to grant (default: system).',
        )
        parser.add_argument(
            '--reset-password', action='store_true',
            help='If the account already exists, issue it a new random password instead of erroring out.',
        )

    def handle(self, *args, **options):
        email = options['email'].strip().lower()
        name = options['name']
        tier = options['tier']
        password = _generate_password()

        user = User.objects.filter(email=email).first()
        if user is not None and not options['reset_password']:
            raise CommandError(
                f'A user with email {email} already exists. Pass --reset-password to issue it a new password.'
            )

        if user is None:
            user = User(email=email, username=email, first_name=name)

        user.set_password(password)
        user.account_verified = True  # skip the signup OTP gate
        user.is_active = True
        user.is_staff = False
        user.is_superuser = False
        user.admin_tier = tier
        user.save()

        self.stdout.write(self.style.SUCCESS(
            f'Admin account ready: {email}\n'
            f'Password (shown once -- store it securely now): {password}\n'
            f'Tier: {tier}\n'
            f'Authenticate via POST /api/v1/admin/auth/login/, then verify the emailed OTP via '
            f'POST /api/v1/admin/auth/login/verify/.'
        ))
