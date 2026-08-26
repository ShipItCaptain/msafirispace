import uuid


class RequestIDMiddleware:
    """
    Attach a stable request id to each request/response so frontend and backend
    logs can be correlated when failures happen.
    """

    HEADER_NAME = "X-Request-ID"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        incoming = request.headers.get(self.HEADER_NAME) or request.META.get("HTTP_X_REQUEST_ID")
        request_id = incoming or str(uuid.uuid4())
        request.request_id = request_id

        response = self.get_response(request)
        response[self.HEADER_NAME] = request_id
        return response
