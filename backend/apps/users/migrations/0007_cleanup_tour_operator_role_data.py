from django.db import migrations


def cleanup_tour_operator_role(apps, schema_editor):
    User = apps.get_model('users', 'User')
    allowed_roles = {'guest', 'bnb_host', 'hotel_host'}

    for user in User.objects.all().iterator():
        roles = list(user.roles or [])
        cleaned_roles = [role for role in roles if role in allowed_roles]

        if 'guest' not in cleaned_roles:
            cleaned_roles.append('guest')

        active_role = user.active_role
        if active_role not in allowed_roles:
            active_role = 'guest'

        if cleaned_roles != roles or active_role != user.active_role:
            user.roles = cleaned_roles
            user.active_role = active_role
            user.save(update_fields=['roles', 'active_role'])


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0006_remove_tour_operator_role'),
    ]

    operations = [
        migrations.RunPython(cleanup_tour_operator_role, migrations.RunPython.noop),
    ]
