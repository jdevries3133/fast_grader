#!/bin/sh

export DJANGO_SETTINGS_MODULE="fast_grader.settings.production"

/home/jack/fast_grader/venv/bin/gunicorn \
    --access-logfile - \
    --workers 3 \
    --bind unix:/home/jack/fast_grader/gunicorn.sock \
    fast_grader.wsgi:application
