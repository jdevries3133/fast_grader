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

from rest_framework.negotiation import DefaultContentNegotiation
from rest_framework.renderers import BrowsableAPIRenderer
from django.conf import settings


# startup-time setting validation, because the TemplateHTMLRenderer is not in
# the list of renderer classes by default, and without it the content
# negotiator won't do anything.
if not (
    'DEFAULT_RENDERER_CLASSES' not in settings.REST_FRAMEWORK or
    'rest_framework.renderers.TemplateHTMLRenderer'
    in settings.REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES']  # type: ignore
):
    raise ValueError('TemplateHTMLRenderer missing from DEFAULT_RENDERER_CLASSES')


class HtmxContentNegotiator(DefaultContentNegotiation):

    def select_renderer(self, request, renderers, format_suffix):
        """In the presence of a `HX-Request: true` header, return html content,
        and avoid using the BrowsableAPIRenderer, which is the default for
        html content types.
        """
        if request.META.get("HTTP_HX_REQUEST") == 'true':
            for renderer in renderers:
                if 'text/html' in renderer.media_type and not isinstance(renderer, BrowsableAPIRenderer):
                    return (renderer, renderer.media_type)

        return super().select_renderer(request, renderers, format_suffix)
