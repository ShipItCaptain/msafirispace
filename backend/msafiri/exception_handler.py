import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


logger = logging.getLogger(__name__)


def msafiri_exception_handler(exc, context):
    """
    Ensure API error responses include request_id for observability.
    """
    request = context.get("request")
    request_id = getattr(request, "request_id", None)

    response = drf_exception_handler(exc, context)
    if response is not None:
        if isinstance(response.data, dict) and request_id and "request_id" not in response.data:
            response.data["request_id"] = request_id
        return response

    logger.exception(
        "Unhandled API exception",
        extra={
            "request_id": request_id,
            "path": getattr(request, "path", None),
            "method": getattr(request, "method", None),
        },
    )
    return Response(
        {
            "detail": "Internal server error",
            "request_id": request_id,
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
