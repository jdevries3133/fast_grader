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
from pathlib import Path
import json

from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.utils.decorators import method_decorator
from django.urls import reverse
from django.views import View
from django.views.defaults import bad_request, page_not_found

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .services import (
    Course,
    list_all_class_names,
    list_all_assignment_names,
    get_student_data,
    get_assignment_data,
    sync_assignment_data
)


# TODO: test paging in all cases


logger = logging.getLogger(__name__)


@ login_required
def grader(request):
    """This template is basically just a wireframe that includes a bunch
    of dynamic htmx components, defined in the views below."""
    return render(request, 'grader/main.html')


@ login_required
def flush_selections(request):
    for k in ('course', 'assignment'):
        request.session.pop(k, None)
    return redirect(reverse('grader'))


@ login_required
def grading_tool(request):
    """The main grading tool, which will be fetched after the two setup flows
    below have been completed."""
    return render(
        request,
        'grader/partials/tool.html',
        context={
            'course': request.session['course'],
            'assignment': request.session['assignment'],
        }
    )


@ method_decorator(login_required, name='dispatch')
class ChooseCourseView(View):
    """Flow of htmx partials that leads to request.session['course'] being set.

    Params:
        'next': page token for more classes

    Methods:
        GET: return a list of classes in context
        POST: select a class

    Session Data:
        course: dict(id: str, name: str)
            - the course that will be used throughout the grading session
            - the purpose of this view is to define this value

        _id_to_course_name_mapping: dict
            - private mapping used by this view only

    Note:
        This view does not use a Django form, because the choices are dynamic.
        This implementation mirrors the below ChooseAssignmentView

    Refactor:
        In a future refactor, it might be a good idea to move some state into
        hidden form fields, or otherwise be a bit more flexible about the
        sequence that requests come in. Currently, POSTing a class choice
        before GETting the form, for example, is a bad request. In reality,
        we could be more flexible about taking what we get, and we could
        also keep some of the session data stored in hypertext. Just something
        to think about, and it applys for the assignment choice view below,
        as well.
    """

    def dispatch(self, request, *a, **kw):
        """Early exit if the course choice was already made."""
        if request.session.get('course') is not None:
            return self._course_choice_made(request)
        return super().dispatch(request, *a, **kw)

    def get(self, request):
        """Return the form to set the course if it is not already set.
        Otherwise, return the _course_choice_made view."""
        page_token = request.GET.get('next')
        classes = list_all_class_names(user=request.user, page_token=page_token)

        request.session['_id_to_course_name_mapping'] = {
            c.id_ : c.name for c in classes.classes
        }
        context = {'classes': classes}

        return render(request, 'grader/partials/choose_course.html', context=context)

    def post(self, request):
        """Recieve user selection from post request data, and then return the
        _course_choice_made view."""
        choice_id = request.POST.get('choice')

        if not (mapping := request.session.get('_id_to_course_name_mapping')):
            msg =  'Post request sent before form was acquired via get request'
            return bad_request(request, msg)

        choice_name = mapping.get(choice_id)
        if not choice_name:
            return page_not_found(request, 'Course does not exist in course names')

        if request.session.get('assignment'):
            del request.session.get['assignment']
        request.session['course'] = {'id': choice_id, 'name': choice_name}

        return self._course_choice_made(request)

    @ staticmethod
    def _course_choice_made(request):
        """Simple view of the already-made choice of course."""
        return render(
            request,
            'grader/partials/course_choice_made.html',
            context={'course': request.session['course']}
        )


@ method_decorator(login_required, name='dispatch')
class ChooseAssignmentView(View):
    """Flow of htmx partials that leads to request.session['assignment']
    being set.
    Params:
        'next': page token for more classes

    Methods:
        GET: return a form for selecting assignment or the currently selected
             assignment
        POST: select an assignment

    Session Data:
        assignment: dict
            - the assignment that will be used throughout the grading session
            - the purpose of this view is to define this value
            - keys are `id` and `name`

        student_id_to_name_mapping: dict
            - responses later in the process only return student ids
            - if we want the user to be able to see the name, we need to
              make sure that the mapping is saved after this class's flow
              has completed.

        _id_to_assignment_name_mapping: dict
            - private mapping used by this view only and discarded when view
            - flow is complete

    Note:
        This view does not use a Django form, because the choices are dynamic.

        This implementation mirrors the above ChooseCourseView, only differing
        in the fact that the mapping is created if not defined on a post
        request.
    """


    def dispatch(self, *a, **kw):

        # 1. We make sure that session['course'] is already set, because the
        #    flow through the above view should be complete
        if self.request.session.get('course') is None:
            msg = (
                'Cannot attempt to choose assignment before course choice '
                'is made.'
            )
            logger.error(msg)
            return bad_request(self.request, msg)

        # 2. quick exit if the assgt is already chosen
        if self.request.session.get('assignment') is not None:
            return self._choice_made()

        return super().dispatch(*a, **kw)

    def get(self, request):
        # fetch data and update _id_to_assignment_name_mapping
        page_token = request.GET.get('next')
        next_page_token = self.update_mapping(page_token)

        # assemble context
        context = {
            'assignments': self.request.session['_id_to_assignment_name_mapping']
        }
        if next_page_token is not None:
            context['next_page_token'] = next_page_token

        # return the assignment choice form
        return render(
            request,
            'grader/partials/choose_assignment.html',
            context=context
        )

    def post(self, request):
        if not (mapping := request.session.get('_id_to_assignment_name_mapping')):
            self.update_mapping()

        assignment_choice = {
            'id':   (_id := request.POST.get('choice')),
            'name': mapping[_id]
        }

        request.session['assignment'] = assignment_choice
        return self._choice_made()

    def update_mapping(self, page_token=None):
        """Mapping of the course's assignment names to their ids.

        Returns the next page token to allow for further updates"""
        self.request.session.setdefault('_id_to_assignment_name_mapping', {})
        result = list_all_assignment_names(
            user=self.request.user,
            course=Course(
                self.request.session['course']['id'],
                self.request.session['course']['name'],
            ),
            page_token=page_token
        )
        for a in result.assignments:
            self.request.session['_id_to_assignment_name_mapping'].setdefault(a.id_, a.name)
        # see "gotcha" condition: https://docs.djangoproject.com/en/3.2/topics/http/sessions/#when-sessions-are-saved
        self.request.session.modified = True

        return result.next_page_token

    def map_student_ids_to_names(self):
        """There comes a point in all of this where we get student ids with
        their coursework, but the names are not included. When that happens,
        we need to be able to lookup the names by id."""
        names = get_student_data(
            user=self.request.user,
            course_id=self.request.session['course']['id']
        )
        self.request.session['student_id_to_name_mapping'] = {
            n.id_ : n.name for n in names
        }

    def _choice_made(self):
        # after the choice is made, we can get the students' names
        if self.request.session.get('student_id_to_name_mapping') is None:
            self.map_student_ids_to_names()
        response =  render(
            self.request,
            'grader/partials/assignment_choice_made.html',
            context=self.request.session['assignment'],
        )
        # after the choice is made, we can send a signal to the frontend to
        # initialize the grading tool
        response['Hx-Trigger'] = 'startGrader'
        return response


class AssessmentDataView(APIView):
    """Interacts with frontend javascript in static/script.js for serving and
    recieving assessment feedback data."""

    permission_classes = [IsAuthenticated]

    def dispatch(self, request, *a, **kw):
        if (
            request.session.get('course') is None
            or request.session.get('assignment') is None
        ):
            msg = (
                'Course and assignment must be selected before assignment '
                'data can be served.'
            )
            return Response(msg, status.HTTP_400_BAD_REQUEST)
        return super().dispatch(request, *a, **kw)

    def get(self, request):
        # note: we should let the client pick the text wrapping with a url
        # param, then format it here in python where that is easier to do.
        data = get_assignment_data(
            course_id=request.session['course']['id'],
            assignment_id=request.session['assignment']['id'],
            user=request.user,
            page_token=request.query_params.get('next_page')
        )
        map_ = request.session['student_id_to_name_mapping']

        # get name from mapping, and adapt to a more javascript-friendly
        # data structure
        formatted_data = [
            {
                'id': i['id_'],
                'studentName': map_[i['student_profile_id']],
                'studentSubmission': i['student_submission'],
                'comment': i['comment'],
                'maxGrade': i['max_grade'],
                'grade': ''
            } for i in data
        ]
        return Response(formatted_data)

    def post(self, request):
        """Sync the data"""
        return Response('')
