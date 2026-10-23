from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator

IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']
DOCUMENT_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png']

validate_image_extension = FileExtensionValidator(allowed_extensions=IMAGE_EXTENSIONS)
validate_document_extension = FileExtensionValidator(allowed_extensions=DOCUMENT_EXTENSIONS)


def validate_image_size(file):
    max_bytes = 5 * 1024 * 1024
    if file.size > max_bytes:
        raise ValidationError('Image must be 5MB or smaller.')


def validate_document_size(file):
    max_bytes = 10 * 1024 * 1024
    if file.size > max_bytes:
        raise ValidationError('Document must be 10MB or smaller.')
