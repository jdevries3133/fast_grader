#!/bin/sh

python3 manage.py migrate

exec gunicorn --access-logfile - \
    --workers 3 \
    --bind 0.0.0.0:8000 \
    fast_grader.wsgi:application
