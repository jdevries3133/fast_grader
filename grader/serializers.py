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

import logging
from django.core.exceptions import ValidationError

from rest_framework import serializers

from .models import GradingSession, AssignmentSubmission


logger = logging.getLogger(__name__)


class AssignmentSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssignmentSubmission
        fields = (
            'pk',
            'api_student_profile_id',
            'api_student_submission_id',
            'submission',
            'student_name',
            'grade',
            'comment'
        )

    def validate_submission(self, data):
        if isinstance(data, list):
            try:
                data = '\n'.join(data)
            except TypeError as e:
                raise ValidationError(e)
        return data

    def to_representation(self, instance):
        repr_ = super().to_representation(instance)
        repr_['submission'] = repr_['submission'].split('\n')
        return repr_



class GradingSessionSerializer(serializers.ModelSerializer):
    submissions = AssignmentSubmissionSerializer(many=True)
    class Meta:
        model = GradingSession
        fields = (
            'pk',
            'api_course_id',
            'api_assignment_id',
            'max_grade',
            'teacher_template',
            'submissions'
        )
