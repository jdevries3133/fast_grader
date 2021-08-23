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

from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls.base import reverse

from ..services import ClassItem, ClassesList


class TestChooseCourseView(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username='foo',
            email='test@test.com',
            password='bar'
        )
        self.client.force_login(self.user)

    @ patch('grader.views.list_all_class_names')
    def test_get_initial(self, mock):
        # setup mock
        mock.return_value = ClassesList(next_page_token=None, classes=[
            ClassItem(id_='a_id', name='a'),
            ClassItem(id_='b_id', name='b')
        ])

        # action: make request 
        response = self.client.get(reverse('list_classes'))
        html = str(response.content, response.charset)  # type: ignore

        # assertion: initially, we get the form when no selection is made
        self.assertIn('<form hx-post="/grader/list_classes/">', html)
        self.assertIn('<option value="a_id">a</option>', html)
        self.assertIn('<option value="b_id">b</option>', html)

        # assertion: this initial request will get the course data from google
        # (mocked here), and create a mapping between course names and
        # identifiers.
        self.assertEqual(self.client.session['_id_to_course_name_mapping'], {
            'a_id': 'a',
            'b_id': 'b'
        })


    @ patch('grader.views.list_all_class_names')
    def test_get_after_choice_made(self, mock):
        # setup: mock
        mock.return_value = ClassesList(next_page_token=None, classes=[
            ClassItem(id_='a_id', name='a'),
            ClassItem(id_='b_id', name='b')
        ])

        # setup: this mocks the choice being made
        session = self.client.session
        session['course'] = 'foo'  # not None
        session.save()

        # action: make the request
        response = self.client.get(reverse('list_classes'))
        html = str(response.content, response.charset)  # type: ignore

        # assertion: now, we should just get the placeholder content
        self.assertNotIn('form', html)


    @ patch('grader.views.list_all_class_names')
    def test_post_invalid_state(self, mock):
        """It is important that _id_to_course_name_mapping is defined before
        the post request is made."""
        # setup: mock
        mock.return_value = ClassesList(next_page_token=None, classes=[
            ClassItem(id_='a_id', name='a'),
            ClassItem(id_='b_id', name='b')
        ])

        # assertion: selection will fail without mapping in client session
        response = self.client.post(reverse('list_classes'), {
            'choice': 'a_id'
        })
        self.assertEqual(response.status_code, 400)

    @ patch('grader.views.list_all_class_names')
    def test_post_valid_state(self, mock):
        # setup: mock
        mock.return_value = ClassesList(next_page_token=None, classes=[
            ClassItem(id_='a_id', name='a'),
            ClassItem(id_='b_id', name='b')
        ])

        # setup: put the mapping into the session
        s = self.client.session
        s['_id_to_course_name_mapping'] = {
            'a_id': 'course name a',
            'b_id': 'b'
        }
        s.save()

        # action: make the request with the mapping set up
        response = self.client.post(reverse('list_classes'), {
            'choice': 'a_id'
        })

        # assert: request shold succeed and session['course'] should be set
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.session['course'], {
            'name': 'course name a',
            'id': 'a_id'
        })

        # assert: some html tag should have this in it
        self.assertIn(b'>course name a<', response.content)
