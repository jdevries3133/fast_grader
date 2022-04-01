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

from grader.services import NotGoogleDriveAssignment, update_submission

from .models import CourseModel, GradingSession, AssignmentSubmission


logger = logging.getLogger(__name__)


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseModel
        fields = ("owner", "name", "api_course_id")


class AssignmentSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssignmentSubmission
        fields = (
            "pk",
            "api_student_profile_id",
            "api_student_submission_id",
            "profile_photo_url",
            "submission",
            "student_name",
            "grade",
            "comment",
        )

    def validate_submission(self, data):
        if isinstance(data, list):
            try:
                data = "\n".join(data)
            except TypeError as e:
                raise ValidationError(e)
        return data

    def to_representation(self, instance):
        # TODO: this self-updating behavior should be in the model
        if instance:
            try:
                update_submission(submission=instance)
            except NotGoogleDriveAssignment as e:
                raise serializers.ValidationError(
                    {
                        "message": (
                            "There are no google docs or slides attached "
                            "to this assignment. Please try another assignment."
                        )
                    }
                ) from e

        ret = super().to_representation(instance)

        # when diff is requested by query param, render the diff
        if (request := self.context.get("request")) and (
            request.query_params.get("diff") == "true"
        ):
            ret["submission"] = instance.diff

        # otherwise, just normalize the submission by breaking it into a list
        # of strings
        else:
            # split up into an array of strings
            ret["submission"] = ret["submission"].split("\n")

        return ret


class GradingSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GradingSession
        fields = (
            "pk",
            "course",
            "api_assignment_id",
            "max_grade",
            "teacher_template",
            "submissions",
            "average_grade",
            "google_classroom_detail_view_url",
            "sync_state",
        )


class DeepGradingSessionSerializer(GradingSessionSerializer):
    """Nested serializer that includes full AssignmentSubmissions. If submission
    content isn't fresh in the database, this can trigger a lot of API calls
    and be extremely slow due to the behavior of AssignmentSubmissionSerializer."""

    submissions = AssignmentSubmissionSerializer(many=True)
