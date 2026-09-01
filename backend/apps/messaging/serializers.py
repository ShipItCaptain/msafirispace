from rest_framework import serializers
from .models import Message


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.get_display_name', read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'booking', 'sender', 'sender_name', 'body', 'created_at', 'read_at']
        read_only_fields = ['id', 'booking', 'sender', 'sender_name', 'created_at', 'read_at']

    def validate_body(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Message can't be empty.")
        return value
