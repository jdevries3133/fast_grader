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
from typing import Union
from difflib import unified_diff

from allauth.socialaccount.models import SocialToken
from django.contrib.auth.models import User
from django.http.response import Http404
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from googleapiclient.errors import HttpError as GoogClientHttpError

from .models import GradingSession, AssignmentSubmission, CourseModel


# in testing environments, the secrets file may not exist, so it's ok in those
# cases to continue, since google api services will be mocked, anyway
try:
    from fast_grader.settings.secrets import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
except ImportError:
    GOOGLE_CLIENT_ID = None
    GOOGLE_CLIENT_SECRET = None


# todo: refactor this into smaller modules by factoring out:
# - dataclasses
# - google api adapter
#
# especially because we might end up with several api adapter integrations


logger = logging.getLogger(__name__)


def _get_google_api_service(*, user: User, service: str, version: str):
    qs = SocialToken.objects.filter(  # type: ignore
        account__user=user,
        account__provider="google",
    )

    token = qs.order_by("-expires_at").first()

    credentials = Credentials(
        token=token.token,
        refresh_token=token.token_secret,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
    )

    service = build(service, version, credentials=credentials)  # type: ignore
    return service


def get_google_classroom_service(*, user: User):
    """Returns a service object like what is alluded to throught Google API
    documentation, to access resources for a particular user."""
    return _get_google_api_service(user=user, service="classroom", version="v1")


@dataclass
class APIItem:
    id_: str
    name: str


@dataclass
class CourseResource(APIItem):
    ...


@dataclass
class CourseList:
    next_page_token: Union[str, None]
    classes: list[CourseResource]


def get_course(*, user: User, course_id: str) -> dict:
    """Return the top-level course object from the classroom api, documented
    here
    https://googleapis.github.io/google-api-python-client/docs/dyn/classroom_v1.courses.html
    """
    service = get_google_classroom_service(user=user)
    response = service.courses().get(id=course_id).execute()  # type: ignore
    return response


@dataclass
class StudentResource(APIItem):
    photo_url: str


def get_student_data(*, user: User, course_id: str) -> list[StudentResource]:
    """We are going to ignore paging here and just get 200 students. If anyone
    is grading more than 200 assignments in one session, they are just too
    hardcore for us."""
    service = get_google_classroom_service(user=user)
    response = (
        service.courses()  # type: ignore
        .students()
        .list(  # type: ignore
            courseId=course_id,
            pageSize=200,
        )
        .execute()
    )
    students = response.get("students")
    return [
        StudentResource(
            id_=s["profile"]["id"],
            name=s["profile"]["name"]["fullName"],
            photo_url=s["profile"].get("photoUrl", ""),
        )
        for s in students
    ]


def list_all_class_names(
    *, user: User, page_token: Union[str, None] = None
) -> CourseList:
    # initialize service
    service = get_google_classroom_service(user=user)

    # fetch data
    request = service.courses().list(pageSize=30, pageToken=page_token)  # type: ignore
    response = request.execute()
    result = response.get("courses")

    # validate response
    if result is None:
        raise Http404("User does not have any courses")

    # format data and wrap in dataclasses
    classes = [CourseResource(r["id"], r["name"]) for r in result]
    return CourseList(response.get("nextPageToken"), classes)


@dataclass
class AssignmentList:
    next_page_token: Union[str, None]
    assignments: list[APIItem]


def list_all_assignment_names(
    *, user: User, course: CourseResource, page_token: Union[str, None] = None
) -> AssignmentList:
    # initialize service
    service = get_google_classroom_service(user=user)

    # fetch data
    response = (
        service.courses()
        .courseWork()
        .list(  # type: ignore
            pageSize=30, pageToken=page_token, courseId=course.id_, orderBy="dueDate"
        )
        .execute()
    )
    data = response.get("courseWork")

    # validate resonse
    if data is None:
        raise Http404("User does not have any courses")

    # format data and wrap in dataclasses
    classes = [APIItem(r["id"], r["title"]) for r in data]
    return AssignmentList(response.get("nextPageToken"), classes)


def _fetch_raw_assignment_data(course_id, assignment_id, user, page_token: str = None):
    """Returns a tuple of submission_data and assignment_data.

    Submission data contains information about the students' submissions,
    like google drive links.

    Assignment data constains details about the assignment, like the
    maximum number of points
    """
    service = get_google_classroom_service(user=user)
    submsision_data = (
        service.courses()
        .courseWork()
        .studentSubmissions()
        .list(  # type: ignore
            courseId=course_id,
            courseWorkId=assignment_id,
            pageToken=page_token,
            states="TURNED_IN",
        )
        .execute()
    )
    assignment_data = (
        service.courses()  # type: ignore
        .courseWork()
        .get(  # type: ignore
            courseId=course_id,
            id=assignment_id,
        )
        .execute()
    )
    return submsision_data, assignment_data


def download_drive_file_as(*, user: User, id_: str, mime_type: str) -> str:
    """Download a google drive file in any of the supported mime/type

    Note:
        See the supported formats here: https://developers.google.com/drive/api/v3/ref-export-formats
    """

    service = _get_google_api_service(user=user, service="drive", version="v3")
    return (
        service.files().export(fileId=id_, mimeType=mime_type).execute()  # type: ignore
    )


class DriveAttachment(APIItem):
    ...


@dataclass
class StringifiedAttachment:
    header: list[str]
    content: list[str]


@dataclass
class ConcatOutput:
    data: list[StringifiedAttachment]

    def join_lines(self) -> list[str]:
        out = []
        for i in self.data:
            out.extend(i.header)
            out.extend(i.content)
        return out


def concatenate_attachments(
    *, user: User, attachments: list[DriveAttachment]
) -> ConcatOutput:
    """Download each attachment as plain text and concatenate them together,
    returning a ConcatOutput object.

    Note:
        An object is returned because we can separate the header, which
        includes the name of the document, from the content body. This is
        useful if a downstream service wants to perform transformations to
        the content, while treating the header separately, like in the case
        of diffing.
    """
    service = _get_google_api_service(user=user, service="drive", version="v3")
    output: list[StringifiedAttachment] = []

    for a in attachments:
        # header
        header = [a.name, "=" * len(a.name)]
        try:
            data = (
                service.files()  # type: ignore
                .export(fileId=a.id_, mimeType="text/plain")  # type: ignore
                .execute()
            )
            # localization/internationalization: this may become an issue if
            # utf8 is not the encoding in all locales
            content = [l.strip() for l in str(data, "utf8").split("\n") if l]
            output.append(StringifiedAttachment(header, content))

        except GoogClientHttpError as e:
            messages = [e["message"] for e in json.loads(e.content).get("errors", [])]
            if "Export only supports Docs Editors files." in messages:
                logger.debug(
                    "File was not converted because it is not a docs editor "
                    "file (doc, slides, etc)."
                )
            else:
                logger.error("Unexpected condition prevented file export")
                logger.exception(e)
            output.append(
                StringifiedAttachment(
                    header,
                    [
                        f"{a.name} could not be imported because it is not "
                        "from a GSuite program like Google Docs, Google Slides, etc."
                    ],
                )
            )

    return ConcatOutput(output)


def get_assignment_data(
    *,
    course_id: str,
    assignment_id: str,
    user: User,
    student_data: list[StudentResource],
    page_token: str = None,
    diff_only: bool = False,
) -> GradingSession:
    """Student submissions are fetched and squashed into a single string of
    text. If there are multiple attachments, they are concatenated with titles
    in-between.
    """
    student_id_to_data = {resource.id_: resource for resource in student_data}
    # TODO: too thicc
    # TODO: not tested
    # TODO: doin' too much
    submissions, assignment = _fetch_raw_assignment_data(
        course_id, assignment_id, user, page_token
    )
    # prepare teacher attachment to diff against, if requested
    if diff_only:
        attachments = [
            DriveAttachment(
                id_=i.get("driveFile", {}).get("driveFile", {}).get("id"),
                name=i.get("driveFile", {}).get("driveFile", {}).get("title"),
            )
            for i in assignment.get("materials", {})
        ]
        teacher_template = concatenate_attachments(user=user, attachments=attachments)

    # ----
    # if there is an existing session, we will update it rather than creating
    # a new one
    # ----

    existing = GradingSession.objects.filter(  # type: ignore
        course__api_course_id=course_id,
        api_assignment_id=assignment_id,
        course__owner=user,
    ).prefetch_related("submissions")
    if existing:

        # sanity check
        if not len(existing) == 1:
            raise ValueError(
                "more than one grading session exists in the database for a "
                "single assignment"
            )
        existing = existing.first()

        # update the top-level session object (corresponding to a single
        # assignment) if there are new values in the fields.
        if existing.is_graded and (existing.max_grade != assignment.get("maxPoints")):
            existing.max_grade = assignment.get("maxPoints")

        if existing.assignment_name != assignment["title"]:
            existing.assignment_name = assignment["title"]

        if existing.assignment_name != assignment[
            "title"
        ] or existing.max_grade != assignment.get("maxPoints"):
            existing.save()

        submission_updates = []
        for submission_from_database in existing.submissions.all():
            match_found = False
            for submission_from_google in submissions.get("studentSubmissions", []):
                if (
                    submission_from_database.api_student_submission_id
                    == submission_from_google["id"]
                ):
                    match_found = True

                    # fetch all attachments
                    attachments = [
                        DriveAttachment(
                            id_=i["driveFile"]["id"], name=i["driveFile"]["title"]
                        )
                        for i in submission_from_google["assignmentSubmission"][
                            "attachments"
                        ]
                    ]
                    output = concatenate_attachments(user=user, attachments=attachments)

                    # prepare diff if requested
                    if diff_only:
                        for i_st, st in enumerate(output.data):
                            for i_te, te in enumerate(teacher_template.data):
                                if te.header[0] in st.header[0]:
                                    diff = list(
                                        unified_diff(
                                            te.content,
                                            st.content,
                                            n=1,
                                            fromfile="teacher original",
                                            tofile="student submission",
                                        )
                                    )
                                    output.data[i_st].content = diff

                    # finalize submission resource update
                    submission_from_database.submission = "\n".join(output.join_lines())
                    submission_updates.append(submission_from_database)

            if not match_found:
                raise NotImplementedError(
                    "A submission came back from Google that does not currently "
                    "exist in our database. It must be created."
                )

        AssignmentSubmission.objects.bulk_update(  # type: ignore
            submission_updates,
            (
                # fields to update
                "api_student_profile_id",
                "student_name",
                "_profile_photo_url",
                "submission",
            ),
        )
        return existing

    # ----
    # Otherwise (there is not existing session), we need to take the API data
    # and create a new one
    # ----

    course_resource = get_course(user=user, course_id=assignment["courseId"])

    try:
        course = CourseModel.objects.get(api_course_id=course_id)  # type: ignore
    except CourseModel.DoesNotExist:  # type: ignore
        course = CourseModel.objects.create(  # type: ignore
            owner=user, name=course_resource["name"], api_course_id=course_id
        )

    assignment = GradingSession.objects.create(  # type: ignore
        assignment_name=assignment["title"],
        api_assignment_id=assignment_id,
        max_grade=assignment.get("maxPoints"),
        course=course,
    )

    submissions = submissions.get("studentSubmissions", [])
    submission_models = []
    for sub in submissions:
        output = concatenate_attachments(
            user=user,
            attachments=[
                DriveAttachment(id_=i["driveFile"]["id"], name=i["driveFile"]["title"])
                for i in sub["assignmentSubmission"]["attachments"]
            ],
        )
        if diff_only:
            raise NotImplementedError
        submission_string = "\n".join(output.join_lines())
        if student_resource := student_id_to_data.get(sub["userId"]):
            name = student_resource.name
            photo_url = student_resource.photo_url
        else:
            name = "unknown"
            photo_url = None
        submission_models.append(
            AssignmentSubmission(
                assignment=assignment,
                api_student_submission_id=sub["id"],
                api_student_profile_id=sub["userId"],
                student_name=name,
                _profile_photo_url=photo_url,
                submission=submission_string,
            )
        )
    AssignmentSubmission.objects.bulk_create(submission_models)  # type: ignore
    return assignment
