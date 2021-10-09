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


import logging
import subprocess
from pathlib import Path



base_dir = Path(__file__).parents[1]
logger = logging.getLogger(__name__)


def _run_and_log(cmd, *, cwd: Path=None, check: bool=False):
    result = subprocess.run(
        cmd,
        cwd=cwd,
        check=check,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT
    )
    logger.info('Command %s had exit code %d', cmd, result.returncode)
    logger.debug('Output: %s', result.stdout)


def update_source() -> bool:
    """Returns a boolean indicating whether the action was successful."""
    try:
        _run_and_log(['git', 'checkout', 'main'], cwd=base_dir, check=True)
        _run_and_log(
            ['git', 'pull', 'https', 'main'],
           cwd=base_dir,
           check=True
        )
        _run_and_log(
            ['./venv/bin/python3', 'manage.py', 'test'],
           cwd=base_dir,
           check=True
        )
        return True
    except subprocess.CalledProcessError:
        logger.exception('failed to update source code')
        return False


def migrate_database() -> bool:
    try:
        _run_and_log(
            ['./venv/bin/python3', 'manage.py', 'migrate', '--noinput'],
           cwd=base_dir,
           check=True
        )
        return True
    except subprocess.CalledProcessError:
        logger.exception('failed to perform database migration')
        return False


def generate_staticfiles() -> bool:
    logger.debug('making staticfiles')
    try:
        _run_and_log(
            ['./venv/bin/python3', 'manage.py', 'tailwind', 'build'],
           cwd=base_dir,
           check=True
        )
        logger.debug('did tailwind build')
        _run_and_log(
            ['./venv/bin/python3', 'manage.py', 'collectstatic', '--noinput'],
           cwd=base_dir,
           check=True
        )
        logger.debug('collected')
        return True
    except subprocess.CalledProcessError:
        logger.exception('failed to generate staticfiles')
        return False


def rollback_source(commit_hash) -> bool:
    try:
        _run_and_log(
            ['git', 'reset', '--hard', commit_hash],
            cwd=base_dir, check=True
        )
        return True
    except subprocess.CalledProcessError:
        logger.exception('failed to rollback source code')
        return False


def restart_gunicorn():
    # it is impossible to check if this succeeds because it kills our current
    # process, but if the service is configured correctly, systemd will make
    # sure that the service eventually does get restarted.
    _run_and_log(['sudo', 'systemctl', 'restart', 'gunicorn.service'])


def autodeploy():
    proc = subprocess.run(
        ['git', 'rev-parse', 'HEAD'],
        stdout=subprocess.PIPE,
        cwd=base_dir
    )
    current_head = str(proc.stdout, 'utf8').strip()
    if not (update_source() and migrate_database() and generate_staticfiles()):
        logger.info('Redeploy failed. Rolling back source')
        if not rollback_source(current_head) and generate_staticfiles():
            logger.critical('invalid state after bad redeployment')
    else:
        logger.info('Redeploy successful. Restarting gunicorn')
        restart_gunicorn()


if __name__ == '__main__':
    autodeploy()
