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
import logging
import dataclasses

from django.http.response import Http404, HttpResponse
from grader.models import AssignmentSubmission, GradingSession
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.utils.decorators import method_decorator
from django.urls import reverse
from django.views import View
from django.views.defaults import bad_request, page_not_found

from rest_framework.decorators import api_view, permission_classes
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .services import (
    CourseResource,
    StudentResource,
    list_all_class_names,
    list_all_assignment_names,
    get_student_data,
    get_assignment_data,
)

from .serializers import AssignmentSubmissionSerializer, GradingSessionSerializer


# TODO: test paging in all cases


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
    try:
        obj = GradingSession.objects.get(pk=pk, course__owner=request.user)  # type: ignore
    except GradingSession.DoesNotExist:  # type: ignore
        raise Http404("grading session does not exist")

    request.session["course"] = {"id": obj.course.api_course_id, "name": obj.course.name}  # type: ignore
    request.session["assignment"] = {
        "id": obj.api_assignment_id,
        "name": obj.assignment_name,
    }
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
        if request.session.get("course") is not None:
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
            return bad_request(request, msg)

        choice_name = mapping.get(choice_id)
        if not choice_name:
            return page_not_found(request, "Course does not exist in course names")

        request.session["course"] = {"id": choice_id, "name": choice_name}

        return self._course_choice_made(request)

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
        for key in ("_id_to_course_name_mapping", "course"):
            if key in request.session:
                del request.session[key]


@method_decorator(login_required, name="dispatch")
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

    def dispatch(self, *a, **kw):

        # 1. We make sure that session['course'] is already set, because the
        #    flow through the above view should be complete
        if self.request.session.get("course") is None:
            msg = "Cannot attempt to choose assignment before course choice " "is made."
            logger.error(msg)
            return bad_request(self.request, msg)

        # 2. quick exit if the assgt is already chosen
        if self.request.session.get("assignment") is not None:
            return self._choice_made()

        return super().dispatch(*a, **kw)

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
        return self._choice_made()

    def update_mapping(self, page_token=None):
        """Mapping of the course's assignment names to their ids.

        Returns the next page token to allow for further updates"""
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

    def save_student_data_to_session(self):
        """There comes a point in all of this where we get student ids with
        their coursework, but the names are not included. When that happens,
        we need to be able to lookup the names by id."""
        names = get_student_data(
            user=self.request.user, course_id=self.request.session["course"]["id"]
        )
        self.request.session["student_data"] = [dataclasses.asdict(n) for n in names]

    def _choice_made(self):
        # after the choice is made, we can get the students' names
        if self.request.session.get("student_data") is None:
            self.save_student_data_to_session()
        response = render(
            self.request,
            "grader/partials/assignment_choice_made.html",
            context=self.request.session["assignment"],
        )
        # after the choice is made, we can send a signal to the frontend to
        # initialize the grading tool
        response["Hx-Trigger"] = "startGrader"
        return response

    @staticmethod
    def flush_session(request):
        """Restore request session to the initial state before interacting
        with this."""
        for key in ("_id_to_assignment_name_mapping", "assignment", "student_data"):
            if key in request.session:
                del request.session[key]


class AssessmentDataView(APIView):
    """Interacts with frontend javascript in static/grader/script.js for
    serving and recieving assessment feedback data."""

    permission_classes = [IsAuthenticated]

    def dispatch(self, request, *a, **kw):
        if (
            request.session.get("course") is None
            or request.session.get("assignment") is None
        ):
            data = {
                "msg": (
                    "Course and assignment must be selected before "
                    "assignment data can be manipulated."
                )
            }
            res = HttpResponse(json.dumps(data), content_type="application/json")
            res.status_code = 400
            return res
        return super().dispatch(request, *a, **kw)

    def get(self, request):
        raw_students = request.session["student_data"]
        student_data = [StudentResource(**i) for i in raw_students]
        assignment = get_assignment_data(
            course_id=request.session["course"]["id"],
            assignment_id=request.session["assignment"]["id"],
            user=request.user,
            page_token=request.query_params.get("next_page"),
            student_data=student_data,
            diff_only=request.GET.get("diff") or False,
        )
        return Response(GradingSessionSerializer(assignment).data)

    def patch(self, request):
        """This is just hacked together rather than a proper nested serializer
        or viewset. Rewrite after deployment of an MVP."""
        pk = request.data.get("pk", "")
        submissions = request.data.pop("submissions", [])
        # update session
        try:
            update = GradingSession.objects.get(pk=pk, course__owner=request.user)  # type: ignore
        except GradingSession.DoesNotExist:  # type: ignore
            return Response(
                {"message": f"assignment with id of {pk} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        session_serializer = GradingSessionSerializer(
            update, data=request.data, partial=True
        )
        session_serializer.is_valid(raise_exception=True)
        session_serializer.save()
        for s in submissions:
            try:
                update = AssignmentSubmission.objects.get(pk=s["pk"])  # type: ignore
            except AssignmentSubmission.DoesNotExist:  # type: ignore
                return Response(
                    {"message": (f"student submission with id of {pk} not found")},
                    status=status.HTTP_404_NOT_FOUND,
                )
            submission_serializer = AssignmentSubmissionSerializer(
                update, data=s, partial=True
            )
            submission_serializer.is_valid(raise_exception=True)
            submission_serializer.save()

        return Response(session_serializer.data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def session_detail(request, pk):
    try:
        obj = GradingSession.objects.get(pk=pk, course__owner=request.user)  # type: ignore
    except GradingSession.DoesNotExist:  # type: ignore
        raise Http404("session does not exist") from None

    if "application/json" in request.META.get("HTTP_ACCEPT"):
        serializer = GradingSessionSerializer(obj)
        return Response({"session": serializer.data})

    return render(request, "grader/session_detail.html", context={"session": obj})


class SessionViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = GradingSessionSerializer

    def get_queryset(self):
        return GradingSession.objects.filter(course__owner=self.request.user)  # type: ignore


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
