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

from django.urls import path

from . import views

urlpatterns = [
    path("", views.home, name="ext_home"),
    path("session/", views.sessions_list, name="ext_list_sessions"),
    path("session/<int:pk>/", views.session_detail, name="ext_session_detail"),
    path("syncing/<str:assgt_name>/", views.syncing_active, name="ext_syncing_active"),
    path("log_error/", views.log_error, name="log_error"),
]
