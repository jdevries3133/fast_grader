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


from .base import *
from .consume_secrets_file import *

# inject type hints all over the place
import django_stubs_ext
django_stubs_ext.monkeypatch()


# for django-tailwind
INTERNAL_IPS = ['127.0.0.1']

CORS_ORIGIN_ALLOW_ALL = True
CORS_ALLOW_CREDENTIALS = True
ALLOWED_HOSTS = ['localhost']

# see Python's logging levels for valid strings to use
# https://docs.python.org/3/library/logging.html#logging-levels
LOG_LEVEL = 'DEBUG'


EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'


ENABLE_LOGROCKET = False


LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console_logger': {
            'level': 0,
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console_logger'],
        'level': LOG_LEVEL,
        'propagate': True,
    },
    'loggers': {
        'file': {
            'handlers': ['console_logger'],
            'level': LOG_LEVEL,
            'propagate': True,
        },
    }
}
