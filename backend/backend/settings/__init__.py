import os

if os.getenv('DJANGO_DEBUG'):
    from .development import *
else:
    from .production import *
