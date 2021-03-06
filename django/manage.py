#!/usr/bin/env python

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

"""Django's command-line utility for administrative tasks."""
import os
import sys
import multiprocessing


def apply_test_settings():
    sys.argv.append("--settings=fast_grader.settings.test")
    print("Running tests with test settings and supressing log output")


def patch_mac_fork_bug():
    """Workaround for https://code.djangoproject.com/ticket/31169"""
    if os.environ.get("OBJC_DISABLE_INITIALIZE_FORK_SAFETY") != "YES":
        sys.exit(
            "Set OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES in your "
            "environment or Django will not have a good time.\n"
            "See https://code.djangoproject.com/ticket/31169"
        )
    multiprocessing.set_start_method("fork")


def my_modifications(main):
    def new_main():

        if "test" in sys.argv:
            apply_test_settings()
            if sys.platform == "darwin":
                patch_mac_fork_bug()
        main()

    return new_main


@my_modifications
def main():
    """Run administrative tasks."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "fast_grader.settings.development")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
