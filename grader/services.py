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

from dataclasses import dataclass
from typing import Union

from allauth.socialaccount.models import SocialToken
from django.contrib.auth.models import User
from django.http.response import Http404
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

try:
    from fast_grader.settings.secrets import (
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET
    )
except ImportError:
    GOOGLE_CLIENT_ID = None
    GOOGLE_CLIENT_SECRET = None


def _get_google_api_service(*, user: User, service: str, version: str):
    qs = SocialToken.objects.filter(  # type: ignore
        account__user=user,
        account__provider='google',
    )

    # TODO: sometimes, this token will be empty, and we need to handle
    # that case somehow. Right now, it just causes an exception.
    token = qs.order_by('-expires_at').first()

    credentials = Credentials(
        token=token.token,
        refresh_token=token.token_secret,
        token_uri='https://oauth2.googleapis.com/token',
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET
    )

    service = build(service, version, credentials=credentials)  # type: ignore
    return service


def get_google_classroom_service(*, user: User):
    """Returns a service object like what is alluded to throught Google API
    documentation, to access resources for a particular user."""
    return _get_google_api_service(
        user=user,
        service='classroom',
        version='v1'
    )


@ dataclass
class ClassroomAPIItem:
    id_: str
    name: str


@ dataclass
class Course(ClassroomAPIItem): ...


@ dataclass
class CourseList:
    next_page_token: Union[str, None]

    # TODO: rename this field "items" because courses.courses is nasty
    classes: list[Course]


def list_all_class_names(*, user: User, page_token: Union[str, None]=None
                         ) -> CourseList:
    # initialize service
    service = get_google_classroom_service(user=user)

    # fetch data
    request = service.courses().list(pageSize=30, pageToken=page_token)  # type: ignore
    response = request.execute()
    result = response.get('courses')

    # validate response
    if result is None:
        raise Http404('User does not have any courses')

    # format data and wrap in dataclasses
    classes = [Course(r['id'], r['name']) for r in result]
    return CourseList(response.get('nextPageToken'), classes)


@ dataclass
class Assignment(ClassroomAPIItem): ...


@ dataclass
class AssignmentList:
    next_page_token: Union[str, None]

    # TODO: rename this field "items" because assignments.assignments is nasty
    assignments: list[Assignment]


def list_all_assignment_names(
    *,
    user: User,
    course: Course,
    page_token: Union[str, None]=None
) -> AssignmentList:
    # initialize service
    service = get_google_classroom_service(user=user)

    # fetch data
    response = service.courses().courseWork().list(  # type: ignore
        pageSize=30,
        pageToken=page_token,
        courseId=course.id_,
        orderBy='dueDate'
    ).execute()
    data = response.get('courseWork')

    # validate resonse
    if data is None:
        raise Http404('User does not have any courses')

    # format data and wrap in dataclasses
    classes = [Assignment(r['id'], r['title']) for r in data]
    return AssignmentList(response.get('nextPageToken'), classes)
