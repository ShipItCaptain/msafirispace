import uuid


class NoCacheAPIMiddleware:
    """
    The shared-hosting environment's web server (LiteSpeed/Apache) applies
    its own default Cache-Control (observed: max-age=90) to responses that
    don't already specify one -- fine for static assets, but it means a
    browser can serve a stale GET response for up to 90s after a PATCH/POST
    changes the underlying data (e.g. a host updates a listing's price,
    then immediately re-fetches it and sees the old value). Force no-store
    on every API response so the browser never caches it, regardless of
    whatever the web server would otherwise inject.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path.startswith('/api/'):
            response['Cache-Control'] = 'no-store'
        return response


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
