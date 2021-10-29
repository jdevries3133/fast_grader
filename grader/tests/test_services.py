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
from types import SimpleNamespace
from unittest.mock import patch
from pathlib import Path

from django.test import TestCase
from django.contrib.auth.models import User
from googleapiclient.errors import HttpError as GoogClientHttpError

from ..models import GradingSession, CourseModel
from ..services import (
    StudentResource,
    concatenate_attachments,
    DriveAttachment,
    get_assignment_data,
)
from .fixtures import concatenate_attachments_output


TEST_FIXTURES = Path(Path(__file__).parent, "fixtures")


class TestConcatenateAttachments(TestCase):
    """Test exception handling"""

    def setUp(self):
        self.user = User.objects.create_user(  # type: ignore
            username="foo", email="test@test.com", password="bar"
        )

    @patch("grader.services.logger")
    @patch("grader.services._get_google_api_service")
    def test_concatenate_attachments(self, mock_service, mock_logger):
        # with this error, a debug log entry will only be made, because this
        # happens if something as simple as an image being attached to an
        # assignment happens
        service = mock_service.return_value
        files = service.files.return_value
        files.export.side_effect = GoogClientHttpError(
            resp=SimpleNamespace(reason="{}"),
            content=bytes(
                json.dumps(
                    {
                        "errors": [
                            {"message": "Export only supports Docs Editors files."}
                        ]
                    }
                ),
                "utf8",
            ),
        )
        concatenate_attachments(
            user=self.user,
            attachments=[
                DriveAttachment(id_="testId", name="foo attachment"),
            ],
        )
        self.assertEqual(len(mock_logger.debug.mock_calls), 1)
        self.assertEqual(len(mock_logger.error.mock_calls), 0)
        self.assertEqual(
            mock_logger.debug.mock_calls[0].args[0],
            "File was not converted because it is not a docs editor file "
            "(doc, slides, etc).",
        )

        # if the message is not present, escalate the logging, because that
        # could be an unexpected condition
        service = mock_service.return_value
        files = service.files.return_value
        files.export.side_effect = GoogClientHttpError(
            resp=SimpleNamespace(reason="{}"),
            content=bytes(json.dumps({"errors": [{"message": ""}]}), "utf8"),
        )
        concatenate_attachments(
            user=self.user,
            attachments=[
                DriveAttachment(id_="testId", name="foo attachment"),
            ],
        )
        self.assertEqual(len(mock_logger.error.mock_calls), 1)
        self.assertEqual(len(mock_logger.exception.mock_calls), 1)


class TestGetAssignmentData(TestCase):

    # make pyright SHUT UP!
    assgt_data: dict
    course_data: dict
    subm_data: dict
    ungraded_assgt: dict
    ungraded_subm: dict

    def setUp(self):
        self.username = "foo_user"
        self.password = "foo password"
        self.user = User.objects.create_user(
            username=self.username, password=self.password
        )
        self._course = CourseModel.objects.create(  # type: ignore
            owner=self.user, name="foo course", api_course_id="1"
        )
        self.existing = GradingSession.objects.create(  # type: ignore
            assignment_name="foo assignment",
            course=self._course,
            api_assignment_id="1",
            max_grade=10,
            teacher_template="",
        )
        self.existing__no_grade = GradingSession.objects.create(  # type: ignore
            assignment_name="foo assignment",
            course=self._course,
            api_assignment_id="2",
            teacher_template="",
        )
        self.student_data = [
            StudentResource(id_="1", name="joe", photo_url="/foo/bar"),
            StudentResource(id_="2", name="tom", photo_url="/foo/bar"),
        ]

        fixtures = {
            "assgt_data": "example_assignment.json",
            "subm_data": "example_submissions.json",
            "course_data": "example_course.json",
            "ungraded_assgt": "example_ungraded_assignment.json",
            "ungraded_subm": "example_ungraded_submissions.json",
        }
        for name, file in fixtures.items():
            with open(TEST_FIXTURES / file, "r") as jsonf:
                setattr(self, name, json.load(jsonf))

    def setup_mocks(self, fetch, concat, course, is_assignment_graded: bool = True):
        if is_assignment_graded:
            fetch.return_value = (self.subm_data, self.assgt_data)
        else:
            fetch.return_value = (self.ungraded_subm, self.ungraded_assgt)
        course.return_value = self.course_data
        concat.return_value = concatenate_attachments_output.OUTPUT

    @patch("grader.services.get_course")
    @patch("grader.services.concatenate_attachments")
    @patch("grader.services._fetch_raw_assignment_data")
    def test_create_new_session(self, mock_fetcher, mock_concat, mock_course):

        self.setup_mocks(mock_fetcher, mock_concat, mock_course)

        result = get_assignment_data(
            course_id="4",
            assignment_id="5",
            user=self.user,
            student_data=self.student_data,
        )
        self.assertEqual(result.assignment_name, "Demo Assignment")
        self.assertEqual(result.course.name, "Demo Classroom")
        self.assertEqual(result.is_graded, True)
        self.assertEqual(result.average_grade, None)
        self.assertEqual(result.submissions.count(), 2)  # type: ignore

    @patch("grader.services.get_course")
    @patch("grader.services.concatenate_attachments")
    @patch("grader.services._fetch_raw_assignment_data")
    def test_new_session_with_diff_not_implemented(
        self, mock_fetcher, mock_concat, mock_course
    ):

        self.setup_mocks(mock_fetcher, mock_concat, mock_course)

        with self.assertRaises(NotImplementedError):
            get_assignment_data(
                course_id="4",
                assignment_id="5",
                user=self.user,
                student_data=self.student_data,
                diff_only=True,
            )
