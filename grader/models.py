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


class CourseModel(models.Model):
    name = models.CharField(max_length=255)
    api_course_id = models.CharField(max_length=50)


class GradingSession(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    created = models.DateTimeField(auto_now_add=True)

    assignment_name = models.CharField(max_length=255)
    course = models.ForeignKey(
        CourseModel,
        related_name='grading_sessions',
        on_delete=models.SET_NULL,
        null=True
    )


    # only one session can exist for a given assignment. Users can resume
    # previous sessions, and submission data may need to be updated when
    # it is out of sync
    api_assignment_id = models.CharField(max_length=50, unique=True)
    max_grade = models.IntegerField()
    teacher_template = models.TextField(blank=True)

    @ property
    def average_grade(self):
        return list(self.submissions.aggregate(models.Avg('grade')).values())[0]  # type: ignore


class AssignmentSubmission(models.Model):
    # id's needed to fetch more data at different levels
    assignment = models.ForeignKey(
        GradingSession,
        related_name='submissions',
        on_delete=models.CASCADE
    )
    api_student_profile_id = models.CharField(max_length=50)
    api_student_submission_id = models.CharField(max_length=50)

    # information about this assignment
    student_name = models.CharField(max_length=200)
    grade = models.IntegerField(blank=True, null=True)

    # TODO: rename to `content`?
    submission = models.TextField(blank=True)
    comment = models.TextField(blank=True)
