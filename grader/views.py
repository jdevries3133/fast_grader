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

from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.utils.decorators import method_decorator
from django.urls import reverse
from django.views import View
from django.views.defaults import bad_request, page_not_found

from .services import (
    Course,
    list_all_class_names,
    list_all_assignment_names
)

logger = logging.getLogger(__name__)

# TODO: social login is required for these views. We need a means of
# either preventing non-social-login users all together , or directing them
# through a different authentication flow.


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
        course: services.Course
            - the course that will be used throughout the grading session
            - the purpose of this view is to define this value
            - keys are `id` and `name`

        _id_to_course_name_mapping: dict
            - private mapping used by this view only and discarded when view
            - flow is complete

    Note:
        This view does not use a Django form, because the choices are dynamic.
        This implementation mirrors the below ChooseAssignmentView
    """

    def get(self, request):
        """Return the form to set the course if it is not already set.
        Otherwise, return the _course_choice_made view."""
        if request.session.get('course') is not None:
            return self._course_choice_made(request)

        # TODO: test paging
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

        # TODO: the ergonomics of this are not so good. There is no reason
        # that a deterministic sequence of requests are necessary here. We
        # could build the mapping at post-request time. However, in the real
        # world, there is no way for clients to know the ids without first
        # getting the ids from us. Just like we cannot know Google's ids
        # before getting it from them. Therefore, this is ok for now and
        # maybe will be ok forever, but nonetheless is a bit awkward.
        if not (mapping := request.session.get('_id_to_course_name_mapping')):
            msg =  'Post request sent before form was acquired via get request'
            return bad_request(request, msg)

        choice_name = mapping.get(choice_id)
        if not choice_name:
            return page_not_found(request, 'Course does not exist in course names')

        # TODO: there is a coupling problem here, because we need to unset the
        # assignment before changing the course if the assignment has been
        # previously set. This creates coupling between this class and the
        # class below; it's not clear to me what the solution is, but for
        # now I just clear session['assignment'] here where we set
        # session['course']
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

        _id_to_assignment_name_mapping: dict
            - private mapping used by this view only and discarded when view
            - flow is complete

    Note:
        This view does not use a Django form, because the choices are dynamic.

        This implementation mirrors the above ChooseCourseView, only differing
        in the fact that the mapping is created if not defined on a post
        request.
    """
    # TODO: test paging

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

    def _choice_made(self):
        return render(
            self.request,
            'grader/partials/assignment_choice_made.html',
            context=self.request.session['assignment']
        )
