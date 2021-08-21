import os


# this is the "user-friendly" import that will try to recover and provide
# CLI prompts for the secrets file if it does not exist.
if os.getenv('DJANGO_DEBUG'):
    try:
        from . import secrets  # type: ignore
    except ImportError:
        from .create_secrets_file import main as create_secrets
        print("Your secrets file does not exist yet. Let's set it up now.")
        create_secrets()
        from . import secrets  # type: ignore
else:
    # in CI/CD or production, just let exceptions bubble up
    from . import secrets

SECRET_KEY = secrets.SECRET_KEY

SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'APP': {
            'client_id': secrets.GOOGLE_CLIENT_ID,
            'secret': secrets.GOOGLE_CLIENT_SECRET,
            'key': ''
        },
        'SCOPE': [
            'email',
            'profile',
            'https://www.googleapis.com/auth/classroom.coursework.students',
            'https://www.googleapis.com/auth/classroom.courses.readonly'
        ]
    }
}
