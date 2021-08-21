from dataclasses import dataclass

from allauth.socialaccount.models import SocialToken
from django.contrib.auth.models import User
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

from fast_grader.settings.secrets import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET


def _get_google_api_service(*, user: User, service: str, version: str):
    token = SocialToken.objects.get(  # type: ignore
        account__user=user,
        account__provider='google'
    )

    credentials = Credentials(
        token=token.token,
        refresh_token=token.token_secret,
        token_uri='https://oauth2.googleapis.com/token',
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET
    )

    service = build(service, version, credentials=credentials)  # type: ignore
    return service


def get_google_classroom_service(*, user: User):
    """Returns a service object like what is alluded to throught Google API
    documentation, to access resources for a particular user."""
    return _get_google_api_service(
        user=user,
        service='classroom',
        version='v1'
    )


@ dataclass
class ClassworkResource:
    courseId: str
    courseworkId: str


def parse_assignment_url(*, url) -> ClassworkResource:
    """Parse the user-pasted url and convert it to a ClassworkResource object,
    which can be used to fetch more information about the assignment"""
    # TODO: parse a variety of urls.
    # note: we will need to parse a variety of url patterns, as described in
    # the wireframe:
    # - assg't instructions
    # - assg't dtails
    # - assg't submission detail
    # - assg't grading view

    return ClassworkResource('MzgxNTMyMDA3ODU5', 'MzgxNTMyMjU4NTcw')
