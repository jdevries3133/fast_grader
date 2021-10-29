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

from unittest.mock import MagicMock
from django.core.exceptions import ValidationError

from django.test import TestCase

from grader.serializers import AssignmentSubmissionSerializer, GradingSessionSerializer


class TestAssignmentSubmissionSerializer(TestCase):
    def setUp(self):
        self.mock = MagicMock()
        self.instance = AssignmentSubmissionSerializer()

    def test_to_representation(self):
        """Submission should be represented as a list of strings"""
        # setup
        self.mock.submission.__str__.return_value = "foo\nbar"
        # action
        result = self.instance.to_representation(self.mock)
        # assertion
        self.assertEqual(result["submission"], ["foo", "bar"])

    def test_validate_submission_joins_lists(self):
        result = self.instance.validate_submission(["join", "lists"])
        self.assertEqual(result, "join\nlists")

    def test_validate_submission_passes_through_strings(self):
        result = self.instance.validate_submission("passthrough\nstring")
        self.assertEqual(result, "passthrough\nstring")

    def test_validate_submission_validates_type_and_handles_TypeError(self):
        # validate type
        with self.assertRaisesMessage(  # type: ignore
            ValidationError, "sequence item 1: expected str instance, int found"
        ):
            self.instance.validate_submission(["foo", 1])
