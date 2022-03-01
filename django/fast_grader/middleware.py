import logging


logger = logging.getLogger(__name__)


def log_headers(get_response):
    def middleware(request):
        logger.debug("\n")
        logger.debug(request.headers)
        logger.debug("\n")
        response = get_response(request)
        return response

    return middleware
