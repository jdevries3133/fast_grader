# Copyright (C) 2022 John DeVries

# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.

# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.

# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.


# --- Shortcuts for building and shipping the docker container. --- 
#
# `push` is the only rule with dependencies (clean -> build -> test).
# Building the container takes a long time, so we don't necessarily want
# other rules to be dependent on the build rule. Just keep in mind that if you
# *never* have run `make build` then the other rules won't work!

SHELL=/bin/bash

DOCKER_ACCOUNT=jdevries3133
CONTAINER_NAME=fast_grader_django

TAG?=$(shell git describe --tags)


# assuming the use of Docker hub, these constants need not be changed
CONTAINER=$(DOCKER_ACCOUNT)/$(CONTAINER_NAME):$(TAG)


.PHONY: all
all: setup test push deploy


.PHONY: fmt
fmt:
	black .


.PHONY: setup
setup:
	@# this attempts to pull the container of the last major version. Hopefully,
	@# this will get us some cached layers
	docker pull $(DOCKER_ACCOUNT)/$(CONTAINER_NAME):$(shell git describe --tags --abbrev=0) || true


.PHONY: test
test:
ifdef CI
	@# the docker-compose and BuildKit integration is broken, so we need to
	@# disable it for now. This also causes caching to become less effective,
	@# so uncomment this override whenever the integration is fixed
	COMPOSE_DOCKER_CLI_BUILD=0 \
	TAG=$(TAG) \
		docker-compose up -d
	docker exec django_web_1 pytest
else
	@# outside CI, assume the system is already running. Also, attaching an
	@# interactive terminal causes (1) pytest to give colored output, and (2)
	@# pdb to pause at breakpoints
	docker exec -it django_web_1 pytest
endif


.PHONY: push
push:
ifdef CI
	@# we assume that the CI server is always linux/amd64
	docker push $(CONTAINER)
else
	@# on mac, we need a cross-platform build. We could do this in CI too, but
	@# caching breaks when we switch from normal `docker build` to BuildKit
	docker buildx build --platform linux/amd64 --push -t $(CONTAINER) .
endif


.PHONY: deploy
deploy:
	terraform init -input=false

	@# if the current commit is tagged, we will deploy to production
	if [[ $(shell git describe --tags) == $(shell git describe --tags --abbrev=0) ]] ; then \
		terraform workspace select production; \
	fi

	terraform apply -auto-approve
