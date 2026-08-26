from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0002_booking_bnb_listing_alter_booking_hotel_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='booking',
            name='payment_status',
            field=models.CharField(
                choices=[
                    ('pending_payment', 'Pending Payment'),
                    ('unpaid', 'Unpaid'),
                    ('partially_paid', 'Partially Paid'),
                    ('paid', 'Paid'),
                    ('refunded', 'Refunded'),
                ],
                default='unpaid',
                max_length=20,
            ),
        ),
    ]
