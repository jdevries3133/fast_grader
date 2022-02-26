#!/bin/sh

echo '{"sha": "'"$(git rev-parse HEAD)"'"}'
