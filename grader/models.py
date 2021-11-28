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
        null=True,
    )

    # only one session can exist for a given assignment. Users can resume
    # previous sessions, and submission data may need to be updated when
    # it is out of sync
    api_assignment_id = models.CharField(max_length=50, unique=True)
    max_grade = models.IntegerField(null=True)
    teacher_template = models.TextField(blank=True)

    # TODO: the first thing to do here is definitevely determine how sync
    # state will be handled (with an enum probably), then to update everything
    # else.
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
            raise ValueError("cannot get average grade from ungraded assignment")
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

    def __str__(self):
        return self.assignment_name


class AssignmentSubmission(models.Model):
    # id's needed to fetch more data at different levels
    assignment = models.ForeignKey(
        GradingSession, related_name="submissions", on_delete=models.CASCADE
    )
    api_student_profile_id = models.CharField(max_length=50)
    api_student_submission_id = models.CharField(max_length=50)

    # information about this assignment
    student_name = models.CharField(max_length=200)
    _profile_photo_url = models.CharField(max_length=200, null=True)
    grade = models.IntegerField(blank=True, null=True)

    # TODO: rename to `content`?
    submission = models.TextField(blank=True)
    comment = models.TextField(blank=True)

    def __str__(self):
        return self.student_name

    @property
    def profile_photo_url(self):
        return normalize_protocol_url(url=self._profile_photo_url)  # type: ignore
