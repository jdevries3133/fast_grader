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

import os

from django.conf import settings


def app_context(_):
    """Some generic context used throughout various templates."""

    return {
        "debug": settings.DEBUG,
        "enable_logrocket": settings.ENABLE_LOGROCKET,
        "is_production": os.getenv("IS_PRODUCTION") == "true",
    }
