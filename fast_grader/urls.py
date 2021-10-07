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


from django.contrib import admin
from django.urls import path, include

from . import views as generic_pages


urlpatterns = [
    path('accounts/', include('accounts.urls')),
    path('accounts/', include('allauth.urls')),
    path('grader/', include('grader.urls')),
    path('ci_cd/', include('continuous_deployment.urls')),
    path('admin/', admin.site.urls),

    # generic pages
    path('', generic_pages.home, name='home'),
    path('help/', generic_pages.help, name='help'),
    path('about/', generic_pages.about, name='about'),
    path('privacy/', generic_pages.privacy, name='privacy'),
    path('tos/', generic_pages.tos, name='tos'),
]
