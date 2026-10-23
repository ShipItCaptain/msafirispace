import io

from django.core.files.base import ContentFile
from PIL import Image


def compress_image_field(field_file, max_dimension=1920, quality=82):
    """
    Downscale and re-encode an uploaded image in place to cut storage and
    page-load weight. Call from a model's save() before super().save(),
    guarded by `field_file and not field_file._committed` so it only runs
    on a freshly-assigned file, not every re-save of an unchanged row.
    """
    image = Image.open(field_file)
    img_format = image.format or 'JPEG'

    if img_format == 'JPEG' and image.mode in ('RGBA', 'P'):
        image = image.convert('RGB')

    image.thumbnail((max_dimension, max_dimension), Image.LANCZOS)

    buffer = io.BytesIO()
    save_kwargs = {'optimize': True}
    if img_format in ('JPEG', 'WEBP'):
        save_kwargs['quality'] = quality
    image.save(buffer, format=img_format, **save_kwargs)

    field_file.save(field_file.name, ContentFile(buffer.getvalue()), save=False)
