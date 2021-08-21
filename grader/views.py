import json

from django.shortcuts import render

from .services import get_google_classroom_service, parse_assignment_url

# Create your views here.

def grader(request):
    gclient = get_google_classroom_service(user=request.user)
    classwork = parse_assignment_url(url='foobar')

    results = gclient.courses().list(pageSize=10).execute()
    course = results.get('courses', [])
    return render(request, 'grader/main.html', context={'course': course})
