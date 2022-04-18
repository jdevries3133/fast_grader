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
from typing import Union, Tuple

from allauth.socialaccount.models import SocialToken
from django.contrib.auth.models import User
from django.http.response import Http404
from django.conf import settings
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from googleapiclient.errors import HttpError as GoogClientHttpError

from .models import AssignmentSubmission, CourseModel, GradingSession, TeacherTemplate


# TODO: refactor this into smaller modules by factoring out:
# - dataclasses
# - google api adapter


GOOGLE_CLIENT_ID = settings.SOCIALACCOUNT_PROVIDERS["google"]["APP"]["client_id"]
GOOGLE_CLIENT_SECRET = settings.SOCIALACCOUNT_PROVIDERS["google"]["APP"]["secret"]


logger = logging.getLogger(__name__)


class NotGoogleDriveAssignment(ValueError):
    """If the assignment has no google drive attachments, it can't be graded
    with this app, so we will pass an exception up to callers of this module.
    """

    ...


def _get_google_api_service(*, user: User, service: str, version: str):
    qs = SocialToken.objects.filter(
        account__user=user,
        account__provider="google",
    )

    token = qs.order_by("-expires_at").first()
    assert token

    credentials = Credentials(
        token=token.token,
        refresh_token=token.token_secret,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
    )

    return build(service, version, credentials=credentials)


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


def get_student_data(
    *, user: User, course_id: str, student_id: str, service=None
) -> StudentResource:
    """We are going to ignore paging here and just get 200 students. If anyone
    is grading more than 200 assignments in one session, they are just too
    hardcore for us."""
    if not service:
        service = get_google_classroom_service(user=user)
    student = (
        service.courses()  # type: ignore
        .students()
        .get(  # type: ignore
            courseId=course_id,
            userId=student_id,
        )
        .execute()
    )
    return StudentResource(
        id_=student_id,
        name=student["profile"]["name"]["fullName"],
        photo_url=student["profile"].get("photoUrl", ""),
    )


def list_all_class_names(
    *, user: User, page_token: Union[str, None] = None
) -> CourseList:
    # initialize service
    service = get_google_classroom_service(user=user)

    # fetch data
    res = service.courses().list(courseStates="ACTIVE", pageSize=30, pageToken=page_token).execute()  # type: ignore
    result = res.get("courses")

    # validate response
    if result is None:
        raise Http404("User does not have any courses")

    # format data and wrap in dataclasses
    result = [i for i in result if i.get("teacherFolder")]
    classes = [CourseResource(r["id"], r["name"]) for r in result]
    return CourseList(res.get("nextPageToken"), classes)


@dataclass
class AssignmentList:
    next_page_token: Union[str, None]
    assignments: list[APIItem]


def filter_assignments(*, assignments: list) -> list:
    """We can only grade assignments with these properties:

    1. A `driveFile` is attached as a material
    2. At least one of these `driveFile`s have a `shareMode` of `STUDENT_COPY`
    """

    def _check_assignment(a) -> bool:
        """Test if a single assignment meets the criteria."""
        if "materials" not in a:
            return False
        for d in [m for m in a["materials"] if "driveFile" in m]:
            if d["driveFile"]["shareMode"] == "STUDENT_COPY":

                return True
        return False

    ret = []
    for a in assignments:
        if _check_assignment(a):
            ret.append(a)

    return ret


def list_all_assignment_names(
    *, user: User, course: CourseResource, page_token: Union[str, None] = None
) -> AssignmentList:
    # initialize service
    service = get_google_classroom_service(user=user)

    # fetch data
    response = (
        service.courses()  # type: ignore
        .courseWork()
        .list(pageSize=30, pageToken=page_token, courseId=course.id_, orderBy="dueDate")
        .execute()
    )
    data = response.get("courseWork")

    # filter assignments
    data = filter_assignments(assignments=data)

    # validate resonse
    if data is None:
        raise Http404("User does not have any courses")

    # format data and wrap in dataclasses
    classes = [APIItem(r["id"], r["title"]) for r in data]
    return AssignmentList(response.get("nextPageToken"), classes)


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

    def combine_content(self) -> list[str]:
        out = []
        for i in self.data:

            # headers for student attachments have the naming convention:
            #   `Student Name - Document Name`
            # we want to remove the student name to normalize the header, so
            # that the diff against the teacher attachment doesn't identify
            # this header as differing
            if " - " in i.header[0]:
                # we're operating on the first element in the header. The
                # second element is the underline (`===== ...`)
                _, i.header[0], *_ = i.header[0].split(" - ")
                i.header[1] = "=" * len(i.header[0])

            out.extend(i.header)
            out.extend(i.content)
        return out


def concatenate_attachments(
    *, user: User, attachments: list[DriveAttachment]
) -> ConcatOutput:
    """Download each attachment as plain text and concatenate them together,
    returning a ConcatOutput object. Outputted files are sorted in alphabetical
    order by filename.

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
        if a.name is not None:
            header = [a.name, "=" * len(a.name)]
        else:
            header = ["No Name", "======="]
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


def _update_teacher_template(
    user: User,
    course_id: str,
    assignment_id: str,
    template: Union[TeacherTemplate, None],
) -> Tuple[TeacherTemplate, bool]:
    """Returns a boolean indicating whether the template was created."""
    service = get_google_classroom_service(user=user)
    assignment_data = (
        service.courses()  # type: ignore
        .courseWork()
        .get(  # type: ignore
            courseId=course_id,
            id=assignment_id,
        )
        .execute()
    )
    attachments = [
        DriveAttachment(
            id_=i.get("driveFile", {}).get("driveFile", {}).get("id"),
            name=i.get("driveFile", {}).get("driveFile", {}).get("title"),
        )
        for i in assignment_data.get("materials", {}) if i.get("driveFile", {}).get("driveFile", {}).get("id")
    ]

    if len(attachments) == 0:
        logger.debug('attachments: %s', attachments)
        raise ValueError('assignment does not contain any teacher attachments')

    template_content = concatenate_attachments(user=user, attachments=attachments)

    was_created = False
    if template is not None:
        stringified = "\n".join(template_content.combine_content())
        if stringified != template.content:
            template.content = stringified
            template.save()
    else:
        was_created = True
        template = TeacherTemplate.objects.create(
            content="\n".join(template_content.combine_content())
        )
    return template, was_created


def parse_order(template_content: str):
    """Given a teacher template already combined into a single string by
    ConcatOutput.combine_content(), parse the headers back out."""
    lines = template_content.split("\n")
    headers = []
    for i, l in enumerate(lines):
        if "===" in l:
            try:
                headers.append(lines[i - 1])
            except IndexError:
                pass
    return [h.strip() for h in headers]


def _update_submission(
    user: User, submission: AssignmentSubmission
) -> AssignmentSubmission:
    assert submission.teacher_template

    # pull repetitively used values out of the submission
    course_id = submission.assignment.course.api_course_id  # type: ignore
    assignment_id = submission.assignment.api_assignment_id  # type: ignore

    # get submission from Classroom API
    service = get_google_classroom_service(user=user)
    submission_data = (
        service.courses()  # type: ignore
        .courseWork()
        .studentSubmissions()
        .get(  # type: ignore
            courseId=course_id,
            courseWorkId=assignment_id,
            id=submission.api_student_submission_id,
        )
        .execute()
    )
    student_data = get_student_data(
        user=user,
        course_id=course_id,
        student_id=submission_data["userId"],
        service=service,
    )

    # update top-level submission fields
    submission.student_name = student_data.name
    submission._profile_photo_url = student_data.photo_url
    # only allow google classroom grades to overwrite our grades if the whole
    # assignment is marked as synced
    if submission.assignment.is_synced:
        submission.grade = submission_data.get("assignedGrade") or submission_data.get(
            "draftGrade"
        )

    # diffs will be more accurate if we reorder student attachments to match
    # the order of teacher attachments. Note that student attachment names
    # will include, but not match, teacher attachment names. i.e.:
    #
    # | Teacher Attachment Name | Student Submission Name     |
    # | ----------------------- | --------------------------- |
    # | foo document            | Student Name - foo document |
    #
    # therefore, for a matching student submission, we can make the following
    # assertion:
    #
    # >>> assert teacher_attachment_name in student_submission_name

    template_item_order = parse_order(submission.teacher_template.content)
    attachments = submission_data.get("assignmentSubmission", {}).get("attachments", {})
    ordered_student_attachments = []
    for teacher_item in template_item_order:
        for student_item in attachments:
            if teacher_item in student_item["driveFile"]["title"]:
                ordered_student_attachments.append(
                    DriveAttachment(
                        id_=student_item.get("driveFile", {}).get("id"),
                        name=student_item.get("driveFile", {}).get("title"),
                    )
                )

    # TODO: don't lose attachments that don't match to a teacher attachment

    content = concatenate_attachments(
        user=user, attachments=ordered_student_attachments
    )

    # update models
    if content != submission.submission:
        submission.submission = "\n".join(content.combine_content())
        submission.save()
    return submission


def update_submission(
    *, submission: AssignmentSubmission, force_update: bool = False
) -> AssignmentSubmission:
    """Update the content of the submission and the teacher template. By
    default, only update items that are more than one day old, unless the
    `force_update` parameter is set to True."""
    user = submission.assignment.course.owner

    if (
        force_update
        or not submission.teacher_template
        or submission.teacher_template.needs_update
    ):
        template, was_created = _update_teacher_template(
            user,
            submission.assignment.course.api_course_id,
            submission.assignment.api_assignment_id,
            submission.teacher_template,
        )
        if was_created:
            submission.teacher_template = template
            submission.save()

    if force_update or submission.needs_update:
        submission = _update_submission(user, submission)

    return submission


def _list_assignment_submissions(session: GradingSession) -> list:
    """Retrieve all top-level courseWork submission resources for an
    assignment."""

    service = get_google_classroom_service(user=session.course.owner)

    ret = []
    page_token = None
    while True:
        res = (
            service.courses()  # type: ignore
            .courseWork()
            .studentSubmissions()
            .list(
                courseId=session.course.api_course_id,
                courseWorkId=session.api_assignment_id,
                pageToken=page_token,
            )
            .execute()
        )
        ret += res["studentSubmissions"]
        if (page_token := res.get("nextPageToken")) is None:
            break

    return ret


def overwrite_submissions_using_api_data(session: GradingSession):
    """Delete all AssignmentSubmission objects for a session, and use the
    response from the courses.courseWork Classroom API endpoint to make new
    ones. This service is used on GradingSession creation, and also could
    be helpful for "syncing" an assignment with Google Classroom.

    Note:
        submission content and student profile information are lost in this
        operation, and will be lazily re-fetched in a future operation when
        needed. This obviously has a hidden downstream cost.

        this also causes comments to be lost, which mostly makes this service
        useless for updating, since I don't think we'd ever want that. **IT
        SHOULD BE MODIFIED TO PRESERVE THE COMMENT BEFORE BEING USED FOR
        UPDATING**
    """
    submissions = AssignmentSubmission.objects.filter(assignment=session)
    submissions.delete()

    new_submissions = []
    for goog_submission in _list_assignment_submissions(session):
        new_submissions.append(
            AssignmentSubmission(
                assignment=session,
                api_student_profile_id=goog_submission["userId"],
                api_student_submission_id=goog_submission["id"],
                grade=goog_submission.get("assignedGrade")
                or goog_submission.get("draftGrade"),
            )
        )

    AssignmentSubmission.objects.bulk_create(new_submissions)


def create_or_get_grading_session(
    *, user: User, course: CourseModel, assignment_id: str, full_update: bool = False
) -> Tuple[GradingSession, bool]:
    """Returns a tuple indicating whether the session was created. If an
    existing model is found in the database, a request to Google is not made
    unless `full_update` is set to true."""

    # first, get the source of truth from Google API
    service = get_google_classroom_service(user=user)
    goog_detail = (
        service.courses()  # type: ignore
        .courseWork()
        .get(courseId=course.api_course_id, id=assignment_id)  # type: ignore
        .execute()
    )

    # get or update operation on our database
    session, created = GradingSession.objects.update_or_create(
        course=course,
        api_assignment_id=assignment_id,
        assignment_name=goog_detail["title"],
        ui_url=goog_detail["alternateLink"],
        max_grade=goog_detail["maxPoints"],
    )

    # reach into deeper nesting if necessary
    if created or full_update:
        overwrite_submissions_using_api_data(session)
        return session, True

    return session, False
