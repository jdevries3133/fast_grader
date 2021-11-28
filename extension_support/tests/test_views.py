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

import datetime

from contextlib import contextmanager
from unittest.mock import patch
import pytest

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient


class MockSyncedQuerySet:
    def all(self):
        return [
            {"assignment_name": "unsynced assignment 1", "pk": 1},
            {"assignment_name": "unsynced assignment 2", "pk": 2},
        ]


class MockUnsyncedQuerySet:
    def all(self):
        return [
            {"assignment_name": "synced assgt 1", "pk": 3, "sync_state": "synced"},
            {"assignment_name": "synced assgt 2", "pk": 4, "sync_state": "synced"},
        ]


class MockQs:
    def filter(self, *, sync_state):
        if sync_state == GradingSession.State.NEVER_SYNCED:
            return MockSyncedQuerySet()
        else:
            return MockUnsyncedQuerySet()


@contextmanager
def mocked_queryset():
    with patch("extension_support.views.GradingSession") as mock_model:
        mock_model.objects.filter.return_value = MockQs()
        yield


class TestViews(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="foo", password="bar")
        self.client = APIClient()

    def login(self):
        try:
            token = Token.objects.get(user=self.user)  # type: ignore
        except Token.DoesNotExist:
            token = Token.objects.create(user=self.user)  # type: ignore
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    @patch("extension_support.views.GradingSession", None)
    def test_list_sessions_forbids_unauthenticated(self):
        EXPECTED_RESPONSE_STAUS = 403
        res = self.client.get(reverse("ext_list_sessions"))
        self.assertEqual(res.status_code, EXPECTED_RESPONSE_STAUS)  # type: ignore

    def test_list_sessions_allows_authenticated(self):
        with mocked_queryset():
            EXPECTED_RESPONSE_STAUS = 200
            self.login()
            res = self.client.get(reverse("ext_list_sessions"))
            self.assertEqual(res.status_code, EXPECTED_RESPONSE_STAUS)  # type: ignore

    def test_list_sessions_returns_correct_data(self):
        self.login()
        with mocked_queryset():
            res = self.client.get(reverse("ext_list_sessions"))
            self.assertEqual(
                res.data["synced_sessions"], MockSyncedQuerySet().all()  # type: ignore
            )

            self.assertEqual(
                res.data["unsynced_sessions"],  # type: ignore
                MockUnsyncedQuerySet().all(),
            )

    def test_session_detail(self):
        self.login()
        # login required, will redirect initially
        res = self.client.get(reverse("ext_session_detail", kwargs={"pk": 1}))
        self.assertTrue(res.status_code, 302)  # type: ignore

        self.login()

        # after login, 404 response when the session does not exist
        res = self.client.get(reverse("ext_session_detail", kwargs={"pk": 1}))
        self.assertTrue(res.status_code, 404)  # type: ignore

        with patch("extension_support.views.GradingSession") as mock:
            mock_session = {
                "assignment_name": "foo assignment",
                "average_grade": 13,
            }
            mock.objects.get.return_value = mock_session
            res = self.client.get(reverse("ext_session_detail", kwargs={"pk": 1}))
            # the full session object is passed into the template context
            self.assertEqual(res.data["session"], mock_session)  # type: ignore
