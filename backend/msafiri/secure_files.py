import mimetypes
from io import BytesIO

from django.apps import apps
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from .encrypted_storage import decrypt_field_file

# Which FileFields are encrypted-at-rest and may be fetched through this
# view, and which attribute on the model holds the owning user -- keeps
# this generic view from accidentally serving an unlisted field or model.
DOCUMENT_FIELDS = {
    ('listings', 'bnblisting'): ('host', {'owner_permit', 'company_permit'}),
    ('users', 'bnbhostprofile'): (
        'user',
        {'insurance_document', 'owner_id_front', 'owner_id_back', 'owner_permit', 'company_permit'},
    ),
    ('users', 'hotelrestauranthostprofile'): (
        'user',
        {'health_certificate', 'food_handling_certificate', 'business_permit', 'business_registration_certificate'},
    ),
}


class SecureDocumentView(APIView):
    """
    Streams a decrypted, owner-or-staff-only copy of a KYC document encrypted
    at rest via encrypt_field_file. Not linked from any serializer yet since
    nothing currently reads these documents back -- add that wiring when a
    host-verification review UI needs it.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, app_label, model_name, pk, field_name):
        key = (app_label, model_name)
        if key not in DOCUMENT_FIELDS:
            raise Http404
        owner_field, allowed_fields = DOCUMENT_FIELDS[key]
        if field_name not in allowed_fields:
            raise Http404

        model = apps.get_model(app_label, model_name)
        obj = get_object_or_404(model, pk=pk)

        owner = getattr(obj, owner_field, None)
        if owner != request.user and not request.user.is_staff:
            raise Http404

        field_file = getattr(obj, field_name)
        if not field_file:
            raise Http404

        plaintext = decrypt_field_file(field_file)
        filename = field_file.name.rsplit('/', 1)[-1]
        content_type = mimetypes.guess_type(filename)[0] or 'application/octet-stream'

        return FileResponse(BytesIO(plaintext), content_type=content_type, filename=filename)
