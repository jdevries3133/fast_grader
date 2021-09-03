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

from django.db import models


class Assignment(models.Model):
    api_course_id = models.CharField(max_length=50)
    api_assignment_id = models.CharField(max_length=50)
    max_grade = models.IntegerField()
    teacher_template = models.TextField(null=True)


class AssignmentSubmission(models.Model):
    # id's needed to fetch more data at different levels
    assignment = models.ForeignKey(
        Assignment,
        related_name='submissions',
        on_delete=models.CASCADE
    )
    api_student_profile_id = models.CharField(max_length=50)
    api_student_submission_id = models.CharField(max_length=50)

    # information about this assignment
    student_name = models.CharField(max_length=200)
    grade = models.IntegerField(null=True)
    submission = models.TextField(null=True)
    comment = models.TextField(null=True)
