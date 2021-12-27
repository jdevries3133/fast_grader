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

import os

from .base import *


def exc_getenv(key) -> str:
    """Get value from the environment, or raise an exception if it's not
    defined"""
    if not (value := os.getenv(key)):
        raise ValueError(f"{key} is not provided in environment")
    return value


DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": exc_getenv("POSTGRESQL_DB"),
        "USER": exc_getenv("POSTGRESQL_USERNAME"),
        "PASSWORD": exc_getenv("POSTGRESQL_PASSWORD"),
        "HOST": exc_getenv("POSTGRESQL_HOST"),
        "PORT": "5432",
    }
}


ENABLE_LOGROCKET = True
