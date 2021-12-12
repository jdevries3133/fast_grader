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

from django.contrib.auth.models import User
from django.http.response import Http404
from django.contrib.auth.mixins import LoginRequiredMixin
from grader.models import AssignmentSubmission, CourseModel, GradingSession
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.utils.decorators import method_decorator
from django.urls import reverse
from django.views import View
from django.views.defaults import bad_request, page_not_found

from rest_framework.decorators import api_view, permission_classes
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .services import (
    CourseResource,
    create_or_get_grading_session,
    list_all_class_names,
    list_all_assignment_names,
)

from .serializers import (
    AssignmentSubmissionSerializer,
    DeepGradingSessionSerializer,
    GradingSessionSerializer,
)


logger = logging.getLogger(__name__)


@login_required
def grader(request):
    """This template is basically just a wireframe that includes a bunch
    of dynamic htmx components, defined in the views below."""
    return render(request, "grader/main.html")


@login_required
def resume_grading(request, pk):
    """Setup the request session so that we can resume a previous grading
    session."""
    if GradingSession.objects.filter(pk=pk, course__owner=request.user).exists():
        request.session["grading_session_pk"] = pk

    return grader(request)


@login_required
def flush_selections(request):
    for session_mutating_class in (ChooseCourseView, ChooseAssignmentView):
        session_mutating_class.flush_session(request)
    request.session.save()
    return redirect(reverse("grader"))


@login_required
def grading_tool(request):
    """The main grading tool, which will be fetched after the two setup flows
    below have been completed."""
    return render(
        request,
        "grader/partials/tool.html",
        context={
            "course": request.session["course"],
            "assignment": request.session["assignment"],
        },
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_selections(request):
    """The javascript client needs to be able to get the pk of the course and
    (more importantly) assignment that the user selected via the flows
    represented in ChooseCourseView and ChooseAssignmentView (below).

    If these selections have not been made, the frontend needs to know that,
    too. This view is a bridge for that information.

    Returns:

        selected_course: number
        - pk of the course the user selected via `ChooseCourseView`

        selected_assignment: number
        - pk of the assignment the user selected via `ChooseAssignmentView`
    """

    # look for presence of the session in state. As long as we have that, we
    # can lookup the related course from the session model, and cleanup session
    # state to satisfy ChooseCourseView and ChooseAssignmentView if needed

    if (session_pk := request.session.get("grading_session_pk")) is None:
        return Response(
            {"message": "assignment has not been selected yet"},
            status=status.HTTP_404_NOT_FOUND,
        )

    try:
        session = GradingSession.objects.get(pk=session_pk, course__owner=request.user)
    except (GradingSession.DoesNotExist, Exception):
        logger.exception("failed to initialize grading session")
        return flush_selections(request)

    return Response(
        {"selected_course": session.course.pk, "selected_assignment": session.pk}
    )


@method_decorator(login_required, name="dispatch")
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

        course_model_pk: int
            - primary key of the course model, fetched or created at the end
              of this view's flow

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
        if (pk := request.session.get("grading_session_pk")) is not None:
            course = GradingSession.objects.get(pk=pk).course
            request.session["course"] = {
                "id": course.api_course_id,
                "name": course.name,
            }
            return self._course_choice_made(request)

        if request.session.get("course_model_pk") is not None:
            return self._course_choice_made(request)
        return super().dispatch(request, *a, **kw)

    def get(self, request):
        """Return the form to set the course if it is not already set.
        Otherwise, return the _course_choice_made view."""
        page_token = request.GET.get("next")
        classes = list_all_class_names(user=request.user, page_token=page_token)

        request.session["_id_to_course_name_mapping"] = {
            c.id_: c.name for c in classes.classes
        }
        context = {"classes": classes}

        return render(request, "grader/partials/choose_course.html", context=context)

    def post(self, request):
        """Recieve user selection from post request data, and then return the
        _course_choice_made view."""
        choice_id = request.POST.get("choice")

        if not (mapping := request.session.get("_id_to_course_name_mapping")):
            msg = "Post request sent before form was acquired via get request"
            return bad_request(request, ValueError(msg))

        choice_name = mapping.get(choice_id)
        if not choice_name:
            return page_not_found(
                request, ValueError("Course does not exist in course names")
            )

        request.session["course"] = {"id": choice_id, "name": choice_name}

        self.ensure_course_created()

        return self._course_choice_made(request)

    def ensure_course_created(self) -> None:
        """Ensure that the CourseModel is created, and `course_model_pk`
        exists in the session."""
        if self.request.session.get("course_model_pk"):
            return

        course, _ = CourseModel.objects.update_or_create(
            owner=self.request.user,
            name=self.request.session["course"]["name"],
            api_course_id=self.request.session["course"]["id"],
        )
        self.request.session["course_model_pk"] = course.pk

    @staticmethod
    def _course_choice_made(request):
        """Simple view of the already-made choice of course."""
        return render(
            request,
            "grader/partials/course_choice_made.html",
            context={"course": request.session["course"]},
        )

    @staticmethod
    def flush_session(request):
        """Restore the request session state."""
        for key in ("_id_to_course_name_mapping", "course", "course_model_pk"):
            if key in request.session:
                del request.session[key]


@method_decorator(login_required, name="dispatch")
class ChooseAssignmentView(LoginRequiredMixin, View):
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

        grading_session_pk: int
            - pk of the GradingSession object, created at the end of this
              view's flow

        student_data: list[StudentResource]

        _id_to_assignment_name_mapping: dict
            - private mapping used by this view only and discarded when view
            - flow is complete

    Note:
        This view does not use a Django form, because the choices are dynamic.

        This implementation mirrors the above ChooseCourseView, only differing
        in the fact that the mapping is created if not defined on a post
        request.
    """

    def dispatch(self, request, *a, **kw):
        if (pk := request.session.get("grading_session_pk")) is not None:
            course = GradingSession.objects.get(pk=pk).course
            request.session["course"] = {
                "id": course.api_course_id,
                "name": course.name,
            }
            return self._choice_made()
        # 1. We make sure that session['course'] is already set, because the
        #    flow through the above view should be complete
        if self.request.session.get("course") is None:
            msg = "Cannot attempt to choose assignment before course choice " "is made."
            logger.error(msg)
            return bad_request(self.request, ValueError(msg))

        # 2. quick exit if the assgt is already chosen
        if self.request.session.get("assignment") is not None:
            return self._choice_made()

        return super().dispatch(request, *a, **kw)

    def get(self, request):
        # fetch data and update _id_to_assignment_name_mapping
        page_token = request.GET.get("next")
        next_page_token = self.update_mapping(page_token)

        # assemble context
        context = {
            "assignments": self.request.session["_id_to_assignment_name_mapping"]
        }
        if next_page_token is not None:
            context["next_page_token"] = next_page_token

        # return the assignment choice form
        return render(
            request, "grader/partials/choose_assignment.html", context=context
        )

    def post(self, request):
        if not (mapping := request.session.get("_id_to_assignment_name_mapping")):
            self.update_mapping()

        assignment_choice = {
            "id": (_id := request.POST.get("choice")),
            "name": mapping[_id],
        }

        request.session["assignment"] = assignment_choice
        self.ensure_grading_session_created()

        return self._choice_made()

    def ensure_grading_session_created(self):
        """Ensures that the GradingSession model is created, and inserts it
        into session state (`grading_session_pk`)."""
        if self.request.session.get("grading_session_pk"):
            return

        assert isinstance(self.request.user, User)
        session, _ = create_or_get_grading_session(
            user=self.request.user,
            course=CourseModel.objects.get(
                api_course_id=self.request.session["course"]["id"]
            ),
            assignment_id=self.request.session["assignment"]["id"],
        )
        self.request.session["grading_session_pk"] = session.pk

    def update_mapping(self, page_token=None):
        """Mapping of the course's assignment names to their ids.

        Returns the next page token to allow for further updates"""
        assert isinstance(self.request.user, User)
        self.request.session.setdefault("_id_to_assignment_name_mapping", {})
        result = list_all_assignment_names(
            user=self.request.user,
            course=CourseResource(
                self.request.session["course"]["id"],
                self.request.session["course"]["name"],
            ),
            page_token=page_token,
        )
        for a in result.assignments:
            self.request.session["_id_to_assignment_name_mapping"].setdefault(
                a.id_, a.name
            )
        # see "gotcha" condition: https://docs.djangoproject.com/en/3.2/topics/http/sessions/#when-sessions-are-saved
        self.request.session.modified = True

        return result.next_page_token

    def _choice_made(self):
        pk = self.request.session["grading_session_pk"]
        obj = GradingSession.objects.get(pk=pk)
        response = render(
            self.request,
            "grader/partials/assignment_choice_made.html",
            context={"name": obj.assignment_name, "id": obj.api_assignment_id},
        )
        # after the choice is made, we can send a signal to the frontend to
        # initialize the grading tool
        response["Hx-Trigger"] = "startGrader"
        return response

    @staticmethod
    def flush_session(request):
        """Restore request session to the initial state before interacting
        with this."""
        for key in (
            "_id_to_assignment_name_mapping",
            "assignment",
            "student_data",
            "grading_session_pk",
        ):
            if key in request.session:
                del request.session[key]


class GradingSessionViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = GradingSessionSerializer

    def get_queryset(self):
        return GradingSession.objects.filter(course__owner=self.request.user)  # type: ignore


class DeepAssignmentSubmissionViewSet(GradingSessionViewSet):
    serializer_class = DeepGradingSessionSerializer


class AssignmentSubmissionViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = AssignmentSubmissionSerializer

    def get_queryset(self):
        return AssignmentSubmission.objects.filter(assignment__course__owner=self.request.user)  # type: ignore


@login_required
def session_detail(request, pk):
    """Traditional HTML view for showing the grades and comments inputted."""
    try:
        obj = GradingSession.objects.get(pk=pk, course__owner=request.user)  # type: ignore
    except GradingSession.DoesNotExist:  # type: ignore
        raise Http404("session does not exist") from None

    return render(request, "grader/session_detail.html", context={"session": obj})


class DeleteSession(View):
    def get(self, request, pk):
        """Serve the modal form to confirm session deletion."""
        try:
            obj = GradingSession.objects.get(pk=pk, course__owner=request.user)  # type: ignore
        except GradingSession.DoesNotExist:  # type: ignore
            raise Http404("session does not exist") from None

        return render(
            request,
            "grader/partials/delete_session_form.html",
            context={"session": obj},
        )

    def delete(self, request, pk):
        """Posted upon reciept of the modal form."""
        try:
            obj = GradingSession.objects.get(pk=pk, course__owner=request.user)  # type: ignore
        except GradingSession.DoesNotExist:  # type: ignore
            raise Http404("session does not exist") from None

        context = {"assignment_name": obj.assignment_name}
        obj.delete()
        return render(request, "grader/partials/session_deleted.html", context=context)
