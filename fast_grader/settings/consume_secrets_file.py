# Copyright (C) 2021 John DeVries

# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.

# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.

# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.


"""
This is a "user-friendly" adapter to the raw secrets file. It will try to
import the secrets file, or generate the secrets file with interactive
prompt if the secrets file does not exist.
"""
import os


if os.getenv('DJANGO_DEBUG'):
    try:
        from . import secrets  # type: ignore
    except ImportError:
        from .create_secrets_file import main as create_secrets
        print("Your secrets file does not exist yet. Let's set it up now.")
        create_secrets()
        from . import secrets  # type: ignore
else:
    # in CI/CD or production, just let exceptions bubble up.
    from . import secrets


SECRET_KEY = secrets.SECRET_KEY

SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'APP': {
            'client_id': secrets.GOOGLE_CLIENT_ID,
            'secret': secrets.GOOGLE_CLIENT_SECRET,
            'key': ''
        },
        'AUTH_PARAMS': {
            'access_type': 'offline',
        },
        'SCOPE': [
            'email',
            'profile',
            'https://www.googleapis.com/auth/classroom.coursework.students',
            'https://www.googleapis.com/auth/classroom.courses.readonly',
            'https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly',
            'https://www.googleapis.com/auth/classroom.student-submissions.students.readonly',
            'https://www.googleapis.com/auth/classroom.rosters.readonly',
            'https://www.googleapis.com/auth/classroom.profile.emails',
            'https://www.googleapis.com/auth/classroom.profile.photos',
            'https://www.googleapis.com/auth/drive'
        ]
    }
}

GITHUB_AUTOMATED_CD_SECRET = secrets.GITHUB_AUTOMATED_CD_SECRET
