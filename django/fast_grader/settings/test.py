# Copyright (C) 2022 John DeVries

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

"""Setup and speed up tests"""

from django.core.management.utils import get_random_secret_key

from .base import *


ENABLE_LOGROCKET = False


# it's convenient not to need this during testing. Grabbing a random key also
# ensures that accidental deployment of test settings would cause things to
# blow up instead of being quietly insecure
SECRET_KEY = get_random_secret_key()


# --- OPTIMIZATIONS

# no need to log during testing
import logging

logging.disable()

# debug adds overhead without changing test output
DEBUG = False


# fast but insecure hashing algorithm
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]
