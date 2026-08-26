from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_user_active_role_user_roles'),
    ]

    operations = [
        migrations.DeleteModel(
            name='ConciergeHostProfile',
        ),
        migrations.AlterField(
            model_name='user',
            name='host_type',
            field=models.CharField(
                blank=True,
                choices=[('bnb_host', 'BnB Host'), ('hotel_restaurant_host', 'Hotel/Restaurant Host')],
                help_text='Specific type of host (only for hosts)',
                max_length=30,
                null=True,
            ),
        ),
    ]
