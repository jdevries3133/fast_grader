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


from django.views.generic import TemplateView


class StaticPageView(TemplateView):
    """Wrapper around TemplateView that also disables LogRocket, because I
    don't really need to log users looking at static pages in that level of
    detail."""

    def get_context_data(self, *a, **kw):
        """Set `enable_logrocket` to True in template context."""

        if isinstance(self.extra_context, dict):
            self.extra_context["enable_logrocket"] = False
        else:
            self.extra_context = {"enable_logrocket": False}

        return super().get_context_data(*a, **kw)
