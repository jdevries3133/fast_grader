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
from django.contrib.sitemaps.views import sitemap

from .sitemaps import StaticViewSitemap
from .views import StaticPageView


sitemaps = {
    'static': StaticViewSitemap
}


urlpatterns = [
    path('accounts/', include('accounts.urls')),
    path('accounts/', include('allauth.urls')),
    path('grader/', include('grader.urls')),
    path('ci_cd/', include('continuous_deployment.urls')),
    path('admin/', admin.site.urls),

    path('', StaticPageView.as_view(template_name='core/index.html'), name='home'),
    path('help/', StaticPageView.as_view(template_name='core/help.html'), name='help'),
    path('about/', StaticPageView.as_view(template_name='core/about.html'), name='about'),
    path('privacy/', StaticPageView.as_view(template_name='core/privacy_policy.html'), name='privacy_policy'),
    path('tos/', StaticPageView.as_view(template_name='core/terms_of_service.html'), name='terms_of_service'),

    path(
        'sitemap.xml',
        sitemap,
        {'sitemaps': sitemaps},
        name='django.contrib.sitemaps.views.sitemap'
    )

]
