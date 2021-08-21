try:
    from . import secrets  # type: ignore
except ImportError:
    from .create_secrets_file import main as create_secrets
    print("Your secrets file does not exist yet. Let's set it up now.")
    create_secrets()
    from . import secrets  # type: ignore

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
