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

from django.http.response import Http404
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required

from grader.models import GradingSession


def home(request):
    if request.user.is_authenticated:
        return redirect('ext_sessions_list')
    return render(request, 'ext/home.html')


@ login_required
def sessions_list(request):
    qs = GradingSession.objects.filter(course__owner=request.user)  # type: ignore
    synced = qs.filter(last_synced__isnull=False).all()
    unsynced = qs.filter(last_synced__isnull=True).all()
    return render(request, 'ext/sessions_list.html', {
        'synced_sessions': synced,
        'unsynced_sessions': unsynced
    })


@ login_required
def session_detail(request, pk):
    try:
        session = GradingSession.objects.get(pk=pk)     # type: ignore
    except GradingSession.DoesNotExist:                 # type: ignore
        raise Http404()
    return render(request, 'ext/session_detail.html', {
        'session': session
    })
