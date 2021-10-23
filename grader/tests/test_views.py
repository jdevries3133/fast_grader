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

from copy import deepcopy
import json
from unittest.mock import patch, sentinel

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls.base import reverse

from ..services import CourseResource, CourseList


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
        mock.return_value = CourseList(next_page_token=None, classes=[
            CourseResource(id_='a_id', name='a'),
            CourseResource(id_='b_id', name='b')
        ])

        # action: make request 
        response = self.client.get(reverse('choose_course'))
        html = str(response.content, response.charset)  # type: ignore

        # assertion: initially, we get the form when no selection is made
        self.assertIn(f'form hx-post="{reverse("choose_course")}"', html)
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
        mock.return_value = CourseList(next_page_token=None, classes=[
            CourseResource(id_='a_id', name='a'),
            CourseResource(id_='b_id', name='b')
        ])

        # setup: this mocks the choice being made
        session = self.client.session
        session['course'] = {'name': 'foo course'}
        session.save()

        # action: make the request
        response = self.client.get(reverse('choose_course'))
        html = str(response.content, response.charset)  # type: ignore

        # assertion: now, we should just get the placeholder content
        self.assertIn('Course:', html)
        self.assertIn('foo course', html)


    @ patch('grader.views.list_all_class_names')
    def test_post_invalid_state(self, mock):
        """It is important that _id_to_course_name_mapping is defined before
        the post request is made."""
        # setup: mock
        mock.return_value = CourseList(next_page_token=None, classes=[
            CourseResource(id_='a_id', name='a'),
            CourseResource(id_='b_id', name='b')
        ])

        # assertion: selection will fail without mapping in client session
        response = self.client.post(reverse('choose_course'), {
            'choice': 'a_id'
        })
        self.assertEqual(response.status_code, 400)  # type: ignore

    @ patch('grader.views.list_all_class_names')
    def test_post_valid_state(self, mock):
        # setup: mock
        mock.return_value = CourseList(next_page_token=None, classes=[
            CourseResource(id_='a_id', name='a'),
            CourseResource(id_='b_id', name='b')
        ])

        # setup: put the mapping into the session
        s = self.client.session
        s['_id_to_course_name_mapping'] = {
            'a_id': 'course name a',
            'b_id': 'b'
        }
        s.save()

        # action: make the request with the mapping set up
        response = self.client.post(reverse('choose_course'), {
            'choice': 'a_id'
        })

        # assert: request shold succeed and session['course'] should be set
        self.assertEqual(response.status_code, 200)  # type: ignore
        self.assertEqual(self.client.session['course'], {
            'name': 'course name a',
            'id': 'a_id'
        })

        # assert: we the 'choice made' template should now be served
        self.assertEqual(
            response.templates[0].name,  # type: ignore
            'grader/partials/course_choice_made.html'
        )


class TestAssignmentDataView(TestCase):

    def setUp(self):
        self.client.force_login(User.objects.create_user(
            'foo',
            'bar',
            'baz@b.com'
        ))
        ses = self.client.session
        ses['course'] = {'id': 'foo'}
        ses['assignment'] = {'id': 'bar'}
        ses['student_id_to_name_mapping'] = {}
        ses.save()

    def test_dispatch(self):
        """Why is this set up like this, this is not a happy http time"""
        ses = self.client.session
        del ses['course']
        del ses['assignment']
        ses.save()
        res = self.client.get(reverse('assignment_data'))
        self.assertEqual(res.status_code, 400)  # type: ignore
        self.assertIn(
            'Course and assignment must be selected',
            json.loads(res.content)['msg'],  # type: ignore
        )

    @ patch('grader.views.GradingSession')
    @ patch('grader.views.AssignmentSubmission')
    @ patch('grader.views.GradingSessionSerializer')
    @ patch('grader.views.AssignmentSubmissionSerializer')
    def test_patch(self, s_ser, g_ser, s_mod, g_mod):
        g_mod.objects.get.return_value = sentinel.g_model
        s_mod.objects.get.return_value = sentinel.s_model
        request_data = {
            'pk': 13,
            'data': 'foo',
            'submissions': [
                {'pk': 2, 'data': 'foo'},
                {'pk': 4, 'data': 'bar'}
            ]
        }
        res = self.client.patch(
            reverse('assignment_data'),
            data=json.dumps(request_data),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 200)   # type: ignore
        g_mod.objects.get.assert_called_once_with(pk=13)
        self.assertEqual(s_mod.objects.get.mock_calls[0].kwargs, {'pk': 2})
        self.assertEqual(s_mod.objects.get.mock_calls[1].kwargs, {'pk': 4})

        top_level_only = deepcopy(request_data)
        submissions = top_level_only.pop('submissions')

        self.assertEqual(s_ser.mock_calls[0].args, (sentinel.s_model,))
        self.assertEqual(s_ser.mock_calls[0].kwargs, {
            'data': submissions[0],
            'partial': True
        })

        g_ser.assert_called_once_with(sentinel.g_model, data=top_level_only, partial=True)
