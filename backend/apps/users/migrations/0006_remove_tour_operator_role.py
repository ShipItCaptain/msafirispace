from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_remove_concierge_host_profile'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='active_role',
            field=models.CharField(
                choices=[('guest', 'Guest'), ('bnb_host', 'BnB Host'), ('hotel_host', 'Hotel Accommodation Host')],
                default='guest',
                help_text='Current active role context',
                max_length=30,
            ),
        ),
    ]
