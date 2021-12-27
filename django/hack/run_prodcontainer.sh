#!/bin/bash


# Run a production-like container, where:
# - we access a postgres db running on localhost of the host machine, mapped
#   to the hostname `database` by Docker
# - DJANGO_DEBUG is unset, so Django does not run in debug mode
# - other prod settings in `fast_grader.settings.production` are used, like
#   prod-style logging

# note that the base Dockerfile will always build the static files, but they
# are not served by this container in production. In a larger system, the
# `/src/static_root` path can be mounted as a read-only volume to whatever
# container actually does the static file serving.



# cleanup dangling containers first, to avoid needing to setup an exit trap
docker ps --all | grep "fast_grader_prod" | cut -c 1-15 | xargs docker rm

TAG=$(date +%s)

docker build . -t fast_grader_prod:$TAG


exec docker run \
    -it \
    -p 8000:8000 \
    -v $(pwd):/src \
    --env-file .env.production \
    --name fast_grader_prod \
    fast_grader_prod:$TAG \
        gunicorn --access-logfile - \
        --workers 3 \
        --bind 0.0.0.0:8000 \
        fast_grader.wsgi:application
