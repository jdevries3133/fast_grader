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

"""Run this script to create your secrets file, or it will be triggered
automatically by .consume_secrets_file if the secrets is abesent upon import.
"""

from pathlib import Path

from django.core.management.utils import get_random_secret_key


def create_secrets_file(values: dict):
    with open(Path(Path(__file__).parent, 'secrets.py'), 'w') as f:
        f.write(f"SECRET_KEY = '{get_random_secret_key()}'\n")
        for field_name, field_content in values.items():
            value = field_content['value']
            type_ = field_content['type']
            if type_ == 'str':
                f.write(f"{field_name} = '{value}'\n")
            elif type_ == 'bytes':
                f.write(f"{field_name} = b'{value}'\n")


def main():
    fields = (
        {'name': 'GOOGLE_CLIENT_ID', 'type': 'str'},
        {'name': 'GOOGLE_CLIENT_SECRET', 'type': 'str'},
        {'name': 'GITHUB_AUTOMATED_CD_SECRET', 'type': 'bytes'},
        {'name': 'POSTGRESQL_USERNAME', 'type': 'str'},
        {'name': 'POSTGRESQL_PASSWORD', 'type': 'str'}
    )
    values = {
       f['name'] : {
            'value': input(f'{f["name"]}: '),
            'type': f["type"]
       }
       for f in fields
    }
    create_secrets_file(values)


if __name__ == '__main__':
    main()
