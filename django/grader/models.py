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

from difflib import unified_diff

from django.utils import timezone
from django.contrib.auth.models import User
from django.db import models
from django.utils.translation import gettext_lazy as _


from .utils import normalize_protocol_url


class CourseModel(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    api_course_id = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name


class GradingSession(models.Model):
    created = models.DateTimeField(auto_now_add=True)

    assignment_name = models.CharField(max_length=255)

    # this is the link to the user to view this assignment in the third party
    # application UI. For google classroom, this is used by the browser
    # extension to redirect the user to google classroom
    ui_url = models.CharField(max_length=255)
    course = models.ForeignKey(
        CourseModel,
        related_name="grading_sessions",
        on_delete=models.CASCADE,
    )

    # only one session can exist for a given assignment. Users can resume
    # previous sessions, and submission data may need to be updated when
    # it is out of sync
    api_assignment_id = models.CharField(max_length=50, unique=True)
    max_grade = models.IntegerField()
    teacher_template = models.TextField(blank=True)

    class SyncState(models.TextChoices):
        UNSYNCED = "U", _("UNSYNCED")
        SYNCED = "S", _("SYNCED")

    sync_state = models.CharField(
        max_length=2, choices=SyncState.choices, default=SyncState.UNSYNCED
    )

    @property
    def is_graded(self) -> bool:
        return bool(self.max_grade)

    @property
    def average_grade(self):
        if not self.is_graded:
            return None
        return list(self.submissions.aggregate(models.Avg("grade")).values())[0]  # type: ignore

    @property
    def google_classroom_detail_view_url(self):
        """The url that google's api returns is a link to the assignment
        overview, not the page with input fields for each students' grades. For
        consistency, we just store exactly what the google api gives us in the
        database, and can transform it through this method."""
        return str(self.ui_url).replace(
            "details", "submissions/by-status/and-sort-first-name/all"
        )

    @property
    def is_synced(self):
        return self.sync_state == self.SyncState.SYNCED

    def __str__(self):
        return self.assignment_name


class TeacherTemplate(models.Model):
    """This string is diffed against to provide the differences template. Here,
    the individual attachments Google Drive objects are irrelevant. Like the
    `submission` field on the `AssignmentSubmission` object, this is a sorted
    and concatenated string of all the attachments on the assignment. At this
    stage, we don't really care what is in here – it just gives us something
    to diff against while we are serving student submissions"""

    content = models.TextField()
    last_updated = models.DateTimeField(auto_now=True)

    @property
    def needs_update(self):
        return bool((timezone.now() - self.last_updated).days > 2)  # type: ignore


class AssignmentSubmission(models.Model):
    # relations
    assignment = models.ForeignKey(
        GradingSession, related_name="submissions", on_delete=models.CASCADE
    )
    teacher_template = models.ForeignKey(
        TeacherTemplate, on_delete=models.SET_NULL, null=True
    )

    # ids for Google APIs
    api_student_profile_id = models.CharField(max_length=50)
    api_student_submission_id = models.CharField(max_length=50)

    # student information
    # this information is nullable, because it requires a separate request to
    # fetch, and this allows us to do that lazily.

    # TODO: this should be default='unknown'
    student_name = models.CharField(max_length=200, blank=True, default="")
    _profile_photo_url = models.CharField(max_length=200, blank=True, default="")

    # grading information
    grade = models.IntegerField(null=True)
    comment = models.TextField(blank=True)

    # submission content
    submission = models.TextField(default="no attachments found")

    # metadata
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.student_name or "no name"

    @property
    def profile_photo_url(self):
        return normalize_protocol_url(url=self._profile_photo_url)  # type: ignore

    @property
    def needs_update(self):
        """A detail request will fill the `blank=True` fields on this model.
        Therefore, if any of those fields are empty, or if the model is older
        than one day, a request will be updated.

        Downstream, this will result in a detail request being sent to the
        Classroom API, allowing these fields to be filled, or other updates to
        be applied."""
        is_old = bool((timezone.now() - self.last_updated).days > 2)  # type: ignore
        missing_fields = False
        for field in (
            "teacher_template",
            "student_name",
            "_profile_photo_url",
            "submission",
        ):
            if not getattr(self, field):
                missing_fields = True
        return is_old or missing_fields

    @property
    def diff(self) -> list[str]:
        # avoid circular import
        from grader.services import update_submission

        if not self.teacher_template:
            update_submission(submission=self)

        assert self.teacher_template
        if not self.submission:
            return ["no attachments found"]

        return list(
            unified_diff(
                self.teacher_template.content.split("\n"),
                self.submission.split("\n"),
                fromfile="teacher template",
                tofile="student submission",
                n=3,
            )
        )
