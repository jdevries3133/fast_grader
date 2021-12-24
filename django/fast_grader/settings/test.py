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

"""Speed up tests, provide defaults for secret values."""

from .base import *

import logging

logging.disable()


ENABLE_LOGROCKET = False


# --- OPTIMIZATIONS

# debug adds overhead without changing test output
DEBUG = False


# fast but insecure hashing algorithm
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]


# --- SECRET VALUES PLACEHOLDERS

# provide defaults for secure settings that are not included
SECRET_KEY = "foo"
