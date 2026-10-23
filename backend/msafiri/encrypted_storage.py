from cryptography.fernet import Fernet
from django.conf import settings
from django.core.files.base import ContentFile


def _fernet():
    return Fernet(settings.FILE_ENCRYPTION_KEY)


def encrypt_field_file(field_file):
    """
    Encrypt an uploaded file's bytes in place before they hit storage. Call
    from a model's save() before super().save(), guarded by
    `field_file and not field_file._committed` so it only runs on a
    freshly-assigned file, not every re-save of an unchanged row.
    """
    field_file.seek(0)
    plaintext = field_file.read()
    token = _fernet().encrypt(plaintext)
    field_file.save(field_file.name, ContentFile(token), save=False)


def decrypt_field_file(field_file):
    """Return the decrypted bytes of a field encrypted with encrypt_field_file."""
    field_file.open('rb')
    try:
        token = field_file.read()
    finally:
        field_file.close()
    return _fernet().decrypt(token)
