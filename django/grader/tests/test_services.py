# Copyright (C) 2022 John DeVries

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


from .fixtures.sample_assignments import sample_assignments
from ..services import concatenate_attachments, DriveAttachment, filter_assignments


TEST_FIXTURES = Path(Path(__file__).parent, "fixtures")


class TestConcatenateAttachments(TestCase):
    """Test exception handling"""

    def setUp(self):
        self.user = User.objects.create_user(
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


def test_filter_assignment_names(sample_assignments):
    filtered = filter_assignments(assignments=sample_assignments)

    assert len(filtered) == 2

    for assignment in filtered:

        assert assignment["state"] == "PUBLISHED"
        # being a driveFile attachment type and having a share mode of student
        # copy are the assignment types we want to filter down to

        n_gradable = len(
            [
                m
                for m in assignment["materials"]
                if m.get("driveFile", {}).get("shareMode") == "STUDENT_COPY"
            ]
        )
        assert n_gradable > 0

    # double check that id #2 was removed, which is a google form-based
    # assignment
    assert 2 not in [a["id"] for a in filtered]
