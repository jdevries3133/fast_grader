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
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from grader.models import GradingSession


@ api_view(['GET'])
def home(request):
    if request.user.is_authenticated:
        return redirect('ext_list_sessions')
    return Response({}, template_name='ext/home.html')


@ api_view(['GET'])
@ permission_classes([IsAuthenticated])
def sessions_list(request):
    qs = GradingSession.objects.filter(course__owner=request.user)  # type: ignore
    synced = qs.filter(last_synced__isnull=False).all()
    unsynced = qs.filter(last_synced__isnull=True).all()

    return Response(
        {
            'synced_sessions': synced,
            'unsynced_sessions': unsynced
        },
        template_name='ext/sessions_list.html'
    )


@ api_view(['GET'])
@ permission_classes([IsAuthenticated])
def session_detail(_, pk):
    try:
        session = GradingSession.objects.get(pk=pk)     # type: ignore
    except GradingSession.DoesNotExist:                 # type: ignore
        return Response(status=status.HTTP_404_NOT_FOUND)

    return Response(
        {'session': session},
        template_name='ext/session_detail.html'
    )
