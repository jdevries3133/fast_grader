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


from unittest import TestCase

from ..utils import normalize_protocol_url


class TestNormalizeProtocolUrl(TestCase):
    def test_normalize_protocol_url(self):
        for input_, output in (
            # normalizes None to an empty string
            ({"url": None}, ""),
            # typical usage
            ({"url": "//foo.com/bar"}, "https://foo.com/bar"),
            ({"url": "//foo.com/bar/", "protocol": "ftp"}, "ftp://foo.com/bar/"),
            # does not validate domain or protocol
            ({"url": "//foo/bar/baz", "protocol": "hello"}, "hello://foo/bar/baz"),
            # does not touch protocol if there already is one
            ({"url": "ftp://foo.com/bar", "protocol": "https"}, "ftp://foo.com/bar"),
        ):
            self.assertEqual(normalize_protocol_url(**input_), output)  # type: ignore
