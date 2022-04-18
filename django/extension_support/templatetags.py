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

"""Template library for building absolute urls, which the extension templates
use, since all of their requests are cross-site.

src: https://stackoverflow.com/questions/19024159/how-to-reverse-a-name-to-a-absolute-url-in-django-template/34630561"""

from django import template
from django.urls import reverse


register = template.Library()


@register.simple_tag(takes_context=True)
def abs_url(context, view_name, *args, **kwargs):
    uri: str = context["request"].build_absolute_uri(
        reverse(view_name, args=args, kwargs=kwargs)
    )

    # I don't know why django isn't just handling this case. I think that Django
    # might be looking for a different header, and that proxy server reconfiguration
    # might do the trick, but this works too
    if context["request"].META.get("HTTP_X_SCHEME") == "https":
        uri = uri.replace("http://", "https://")

    return uri
