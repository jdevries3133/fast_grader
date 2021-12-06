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

from django.urls import path
from rest_framework import routers

from .views import (
    DeleteSession,
    flush_selections,
    grader,
    user_selections,
    grading_tool,
    resume_grading,
    session_detail,
    ChooseCourseView,
    ChooseAssignmentView,
    GradingSessionViewSet,
    AssignmentSubmissionViewSet,
)

urlpatterns = [
    path("", grader, name="grader"),
    path("<int:pk>/", resume_grading, name="resume_grading"),
    path("flush_selections/", flush_selections, name="flush_selections"),
    path("user_selections/", user_selections, name="user_selections"),
    path("tool/", grading_tool, name="grading_tool"),
    path("choose_course/", ChooseCourseView.as_view(), name="choose_course"),
    path(
        "choose_assignment/", ChooseAssignmentView.as_view(), name="choose_assignment"
    ),
    path("session/<int:pk>/", session_detail, name="session_detail"),
    path("session/<int:pk>/delete/", DeleteSession.as_view(), name="delete_session"),
]

router = routers.SimpleRouter()
router.register(r"session_viewset", GradingSessionViewSet, "session_viewset")
router.register(
    r"assignment_submission", AssignmentSubmissionViewSet, "session_viewset"
)
urlpatterns += router.urls
