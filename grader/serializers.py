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

from rest_framework.exceptions import ValidationError
from grader.services import AssignmentSubmission
from rest_framework import serializers


class AssignmentDataSerializer(serializers.Serializer):
    id = serializers.CharField()
    studentName = serializers.CharField()
    studentSubmission = serializers.CharField()
    comment = serializers.CharField()
    maxGrade = serializers.CharField()
    grade = serializers.CharField()

    @ classmethod
    def from_assignment_submission(cls, submission: AssignmentSubmission, student_id_to_name: dict):
        self = cls(data={
            'id': submission.id_,
            'studentName': student_id_to_name[submission.student_profile_id],
            'studentSubmission': submission.student_submission,
            'comment': submission.comment,
            'maxGrade': submission.max_grade,
            'grade': submission.grade
        })
        self.is_valid(raise_exception=True)
        return self
