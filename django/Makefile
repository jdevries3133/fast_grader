# Copyright (C) 2021 John DeVries

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
# *never* have run `make build`, then the other rules won't work!


DOCKER_ACCOUNT=jdevries3133
CONTAINER_NAME=fast_grader_django
ENV_FILE=.env.development

TAG=develop-latest

TEST_CMD=python3 manage.py test
DEV_CMD=sh entrypoint_dev.sh

# assuming the use of Docker hub, these constants need not be changed
CONTAINER=$(DOCKER_ACCOUNT)/$(CONTAINER_NAME):$(TAG)
REPO_LINK=https://hub.docker.com/repository/docker/$(DOCKER_ACCOUNT)/$(CONTAINER_NAME)

RUN_ARGS=-p 8000:8000 --env-file $(ENV_FILE)
DEV_ARGS=$(RUN_ARGS) -it -v $(shell pwd):/src -e DJANGO_DEBUG=1


# startup a development postgresql database
dev-db:
	@docker run \
		--detach \
		--name dev-db-for-$(TAG) \
		-e POSTGRES_PASSWORD=$(shell cat .env.development | grep POSTGRESQL_PASSWORD |  sed 's/POSTGRESQL_PASSWORD=\(.*\)/\1/g') \
		-e POSTGRES_USER=$(shell cat .env.development | grep POSTGRESQL_USERNAME |  sed 's/POSTGRESQL_USERNAME=\(.*\)/\1/g') \
		-e POSTGRES_DB=$(shell cat .env.development | grep POSTGRESQL_DB |  sed 's/POSTGRESQL_DB=\(.*\)/\1/g') \
		--publish 5432:5432 \
		postgres:14

check-env:
	# ensure the env file is present. Only necessary before invocations of
	# `docker run`
	if [ ! -f $(ENV_FILE) ]; then \
		echo "env file missing. See $(REPO_LINK)"; \
		exit 1; \
	fi

test: check-env
	docker run $(RUN_ARGS) $(CONTAINER) $(TEST_CMD)

# this creates a container that targets the native architecture as well as
# amd64, which is what is used in production
build:
	docker build  -t $(CONTAINER) .

push: clean dev-db build test
	docker buildx build \
		--push \
		--platform=linux/amd64,linux/$(shell arch) \
		-t $(CONTAINER) .

develop: check-env
	docker run $(DEV_ARGS) $(CONTAINER) $(DEV_CMD)

production:
	ENV_FILE=.env.production && docker run $(RUN_ARGS) $(CONTAINER)

# this removes *all* images containing CONTAINER_NAME, so there can be
# destructive side-effects
clean:
	# remove application container(s)
	docker ps --all | grep $(CONTAINER_NAME) | cut -c 1-15 | xargs docker stop
	docker ps --all | grep $(CONTAINER_NAME) | cut -c 1-15 | xargs docker rm

	# remove any and all dev databases
	docker ps --all | grep dev-db-for | cut -c 1-15 | xargs docker stop
	docker ps --all | grep dev-db-for | cut -c 1-15 | xargs docker rm


# all rules are phony
.PHONY: dev-db check-env test build push develop clean
