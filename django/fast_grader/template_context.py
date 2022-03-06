import os


from django.conf import settings


def app_context(_):
    """Some generic context used throughout various templates."""

    return {
        "debug": settings.DEBUG,
        "enable_logrocket": settings.ENABLE_LOGROCKET,
        "is_production": os.getenv("IS_PRODUCTION") == "true",
    }
