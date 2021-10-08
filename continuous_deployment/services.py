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


from pathlib import Path
from subprocess import Popen

from django.conf import settings


def redeploy():
    """Trigger the shell script that shuts down django and redeploys code."""
    # The redeploy script is going to kill Django. Since we are killing
    # ourselves, we just Popen with no follow-through. Goodbye world! Let's
    # hope the redeploy script is robust :)
    log = open(Path(settings.BASE_DIR, 'automated_deployment.log'), 'a+')
    Popen(
        ['/bin/bash', Path(Path(__file__).parent, 'deploy.sh').resolve()],
        stdout=log,
        stderr=log,
        cwd=settings.BASE_DIR
    )
