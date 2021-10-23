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


def normalize_protocol_url(*, url: str, protocol: str='https') -> str:
    """Protocol urls are urls that do not have the protocol at the beginning;
    i.e. `//foo.com/bar/baz`

    This function mormalizes these to use https by default, or whatever
    protocol is passed in."""

    def is_protocol_url(url):
        return url.startswith('//')

    if is_protocol_url(url):
        return f'{protocol}:{url}'
    return url
