#!/bin/bash

# Run this container by itself, and mount the host source to the container,
# so that Django will re-load on changes.

# cleanup dangling containers first, to avoid needing to setup an exit trap
docker ps --all | grep "fast_grader_dev" | cut -c 1-15 | xargs docker rm

TAG=$(date +%s)

if [[ $1 != '--run-only' ]]
then
    docker build . -t fast_grader_dev:$TAG
fi

exec docker run \
    -it \
    -p 8000:8000 \
    -v $(pwd):/src \
    --env-file .env.development \
    --name fast_grader_dev \
    fast_grader_dev:$TAG \
    sh entrypoint_dev.sh
