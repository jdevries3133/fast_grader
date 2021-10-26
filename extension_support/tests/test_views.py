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

from unittest.mock import MagicMock, patch

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse


class TestViews(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username='foo',
            password='bar'
        )

    def login(self):
        self.client.force_login(user=self.user)

    @ patch('extension_support.views.GradingSession')
    def test_list_sessions(self, mock_model):
        # without login, 302 is returned
        res = self.client.get(reverse('ext_list_sessions'))
        self.assertEqual(res.status_code, 302)  # type: ignore

        self.login()

        # with login, 200 is returned
        res = self.client.get(reverse('ext_list_sessions'))
        self.assertEqual(res.status_code, 200)  # type: ignore


        class MockSyncedQuerySet:

            def all(self):
                return [
                    {
                        'assignment_name': 'unsynced assignment 1',
                        'pk': 1
                    },
                    {
                        'assignment_name': 'unsynced assignment 2',
                        'pk': 2
                    }
                ]


        class MockUnsyncedQuerySet:

            def all(self):
                return [
                    {
                        'assignment_name': 'synced assgt 1',
                        'pk': 3,
                        'last_synced': datetime.datetime(2021, 2, 3),
                    },
                    {
                        'assignment_name': 'synced assgt 2',
                        'pk': 4,
                        'last_synced': datetime.datetime(2020, 2, 3),
                    }
                ]

        class MockQs:
            def filter(self, *, last_synced__isnull):
                if last_synced__isnull:
                    return MockUnsyncedQuerySet()
                else:
                    return MockSyncedQuerySet()

        mock_model.objects.filter.return_value = MockQs()
        res = self.client.get(reverse('ext_list_sessions'))

        self.assertEqual(
            res.context['synced_sessions'],  # type: ignore
            MockSyncedQuerySet().all()
        )

        self.assertEqual(
            res.context['unsynced_sessions'],  # type: ignore
            MockUnsyncedQuerySet().all()
        )

    def test_session_detail(self):
        # login required, will redirect initially
        res = self.client.get(reverse('ext_session_detail', kwargs={'pk': 1}))
        self.assertTrue(res.status_code, 302)  # type: ignore

        self.login()

        # after login, 404 response when the session does not exist
        res = self.client.get(reverse('ext_session_detail', kwargs={'pk': 1}))
        self.assertTrue(res.status_code, 404)  # type: ignore

        with patch('extension_support.views.GradingSession') as mock:
            mock_session = {
                'assignment_name': 'foo assignment',
                'average_grade': 13,
            }
            mock.objects.get.return_value = mock_session
            res = self.client.get(reverse('ext_session_detail', kwargs={'pk': 1}))
            # the full session object is passed into the template context
            self.assertEqual(
                res.context['session'],  # type: ignore
                mock_session
            )
