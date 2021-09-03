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

from rest_framework import serializers

from .models import Assignment, AssignmentSubmission


class AssignmentSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssignmentSubmission
        fields = (
            'api_student_profile_id',
            'api_student_submission_id',
            'student_name',
            'grade',
            'comment'
        )


class AssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        depth = 2
        model = Assignment
        fields =  (
            'api_course_id',
            'api_assignment_id',
            'max_grade',
            'teacher_template',
            'submissions',
        )

    # def update(self, instance, validated_data):
    #     # top-level data
    #     instance.api_course_id = validated_data.get(
    #         'api_course_id',
    #         instance.api_course_id
    #     )
    #     instance.api_assignment_id = validated_data.get(
    #         'api_assignment_id',
    #         instance.api_assignment_id
    #     )
    #     instance.max_grade = validated_data.get(
    #         'max_grade',
    #         instance.max_grade
    #     )
    #     instance.teacher_template = validated_data.get(
    #         'teacher_template',
    #         instance.teacher_template
    #     )
    #     instance.save()

    #     # nested data
    #     items = validated_data.get('assignments', instance.assignments)
    #     for i in items:
    #         a = 
    #         if a.is_valid(raise_exception=True):
    #             a.save()
