from django.conf import settings


def debug_context(_): return {'debug': settings.DEBUG}
def logrocket_context(_): return {'enable_logrocket': settings.ENABLE_LOGROCKET}
