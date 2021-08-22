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

from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from django.utils.decorators import method_decorator
from django.views import View

from .services import (
    list_all_class_names
)


@ login_required
def grader(request):
    """This template is basically just a wireframe that includes a bunch
    of dynamic htmx components, defined in the views below."""
    return render(request, 'grader/main.html')


@ method_decorator(login_required, name='dispatch')
class ChooseCourseView(View):
    """List classes partial view.

    Params:
        'next': page token for more classes

    Methods:
        GET: return a list of classes in context
        POST: select a class

    Session Data:
        course: dict
            - the course that will be used throughout the grading session
            - the purpose of this view is to define this value
            - keys are `id` and `name`

        _id_to_course_name_mapping: dict
            - private mapping used by this view only and discarded when view
            - flow is complete

    Note:
        This view does not use a form, because the choices are dynamic.
    """

    def get(self, request):
        """Return the form to set the course if it is not already set.
        Otherwise, return the _course_choice_made view."""
        if request.session.get('course') is not None:
            return self._course_choice_made(request)

        page_token = request.GET.get('next')
        classes = list_all_class_names(user=request.user, page_token=page_token)

        request.session['id_to_course_name_mapping'] = {
            c.id_ : c.name for c in classes.classes
        }
        context = {'classes': classes}

        return render(request, 'grader/partials/classes_list.html', context=context)

    def post(self, request):
        """Recieve user selection from post request data, and then return the
        _course_choice_made view."""
        choice = request.POST.get('choice')

        choice_name = request.session.get('id_to_course_name_mapping').get(choice)
        request.session['course'] = {'id': choice, 'name': choice_name}

        return self._course_choice_made(request)

    @ staticmethod
    def _course_choice_made(request):
        """Simple view of the already-made choice of course."""
        return render(
            request,
            'grader/partials/class_choice_made.html',
            context={'course': request.session['course']}
        )


