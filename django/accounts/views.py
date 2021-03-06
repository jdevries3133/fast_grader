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

from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from dj_rest_auth.registration.views import SocialLoginView

from grader.models import GradingSession


@login_required
def profile(request):
    """This is where the user will be able to view and export previous grading
    sessions."""
    qs = GradingSession.objects.filter(course__owner=request.user).prefetch_related("submissions")  # type: ignore
    return render(request, "account/profile.html", context={"sessions": qs})


class GoogleLogin(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter
