#!/bin/sh

# Deploy static site

TAG=$(git describe --tags)

docker buildx build \
    --platform linux/amd64 \
    --push \
    -f Dockerfile.documentation \
    -t jdevries3133/fast_grader_docs:$TAG \
    .

terraform init -input=false
terraform apply -auto-approve
