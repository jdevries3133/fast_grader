from django.shortcuts import render, redirect
from django.urls.base import reverse

# Create your views here.

def profile_home(request):
    return redirect(reverse('grader'))
