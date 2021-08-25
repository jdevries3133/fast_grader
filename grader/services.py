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

import json
import logging

from dataclasses import dataclass
from typing import TypedDict, Union

from allauth.socialaccount.models import SocialToken
from django.contrib.auth.models import User
from django.http.response import Http404
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from googleapiclient.errors import HttpError as GoogClientHttpError

try:
    from fast_grader.settings.secrets import (
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET
    )
except ImportError:
    GOOGLE_CLIENT_ID = None
    GOOGLE_CLIENT_SECRET = None


# TODO: refactor this into smaller modules by factoring out:
# - types and enumerations
# - google api adapter


logger = logging.getLogger(__name__)


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


def get_student_data(*, user: User, course_id: str) -> list[ClassroomAPIItem]:
    """We are going to ignore paging here and just get 200 students. If anyone
    is grading more than 200 assignments in one session, they are just too
    hardcore for us."""
    service = get_google_classroom_service(user=user)
    response = service.courses().students().list(  # type: ignore
        courseId=course_id,
        pageSize=200,
    ).execute()
    students = response.get('students')
    return [
        ClassroomAPIItem(s['profile']['id'], s['profile']['name']['fullName'])
        for s in students
    ]



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


class AssignmentSubmission(TypedDict):
    """This structure mirrors how the data is represented in the client
    javascript for easy synchronization. The only difference being that
    it contains the student_profile_id, because this response does not provide
    the actual names."""
    id_: str
    student_profile_id: str
    # this is the submission processed down into plain text
    student_submission: str
    # grade: Union[int, None]
    # max_grade: int
    comment: str


def _fetch_raw_assignment_data(
    course_id,
    assignment_id,
    user,
    page_token:
    str=None
):
    service = get_google_classroom_service(user=user)
    return service.courses().courseWork().studentSubmissions().list(  # type: ignore
        courseId=course_id,
        courseWorkId=assignment_id,
        pageToken=page_token,
        # TODO: this reminds me, giving a zero to all missing submissions with
        # a single comment would be a *pretty sweet* premium feature
        states='TURNED_IN'
    ).execute()


def download_drive_file_as(*, user: User, id_: str, mime_type: str) -> str:
    """Download a google drive file in any of the supported mime/type

    Note:
        See the supported formats here: https://developers.google.com/drive/api/v3/ref-export-formats
    """

    service = _get_google_api_service(user=user, service='drive', version='v3')
    return service.files().export(  # type: ignore
        fileId=id_,
        mimeType=mime_type
    ).execute()


def concatenate_attachments(*, user: User, attachments: list[dict]) -> str:
    """Given a submission object from the google classroom api, download each
    attachment as plain text and concatenate them together, inserting the
    name of the document into the concatednated string."""
    service = _get_google_api_service(user=user, service='drive', version='v3')
    output: list[str] = []

    for a in attachments:
        attachment_name = a.get('driveFile', {}).get('title') or 'Unknown'
        # header
        output.append('\n'.join((
            attachment_name,
            '=' * len(attachment_name)
        )))
        try:
            data = service.files().export(  # type: ignore
                fileId=a['driveFile']['id'],
                mimeType='text/plain'
            ).execute()

            # TODO: confirm that utf8 is *always* the correct encoding. I don't
            # see where I can get the google api client to tell me what
            # encoding it was requesting
            output.append(str(data, 'utf8'))

        except GoogClientHttpError as e:
            messages = [
                e['message'] for e in json.loads(e.content).get('errors', [])
            ]
            if 'Export only supports Docs Editors files.' in messages:
                logger.debug(
                    'File was not converted because it is not a docs editor '
                    'file (doc, slides, etc).'
                )
            else:
                logger.error('Unexpected condition prevented file export')
                logger.exception(e)
            output.append(
                f'{attachment_name} could not be imported because it is not '
                'from a GSuite program like Google Docs, Google Slides, etc.'
            )

    return '\n'.join(output)


def get_assignment_data(
    *,
    course_id: str,
    assignment_id: str,
    user: User,
    page_token: str=None
) -> list[AssignmentSubmission]:
    """Student submissions are fetched and squashed into a single string of
    text. If there are multiple attachments, they are concatenated with titles
    in-between.

    Future Improvements:
        There are a few improvements to be made here after MVP:
        - after getting the first assignment, pass the rest of the processing
          to an async worker, and also make an async request in the frontend
          for the extra data so that the grading can start right away.
        - provide a diff_only option, where we fetch the corresponding document
          from the teacher, then only display the diff against that when
          looking at student work.

    Note:
        This is a wrapper service that calls into .assignment_data, which
        contains the nitty gritty details
    """
    data = _fetch_raw_assignment_data(course_id, assignment_id, user, page_token)
    raw_submissions = data.get('studentSubmissions', [])
    submissions = []
    for sub in raw_submissions:
        submissions.append(AssignmentSubmission(
            id_=sub['id'],
            student_profile_id=sub['userId'],
            student_submission=concatenate_attachments(
                user=user,
                attachments=sub['assignmentSubmission']['attachments']
            ),
            comment=''
        ))
    return submissions




def sync_assignment_data(*, data: list[AssignmentSubmission]):
    """Recieve a modified list of assignment submissions and push the comments
    and grades back into the google classroom api.

    Note:
        - Changes to any fields other than grade and comment will have no
          effect.
        - This is a wrapper service that calls into .assignment_data, which
          contains the nitty gritty details
    """

