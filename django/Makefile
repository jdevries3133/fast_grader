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
# *never* have run `make build` then the other rules won't work!


DOCKER_ACCOUNT=jdevries3133
CONTAINER_NAME=fast_grader_django

TAG?=0.0.10-$(shell git rev-parse HEAD)

# assuming the use of Docker hub, these constants need not be changed
CONTAINER=$(DOCKER_ACCOUNT)/$(CONTAINER_NAME):$(TAG)


.PHONY: all
all: test push deploy


.PHONY: push
push:
	docker buildx build --platform linux/amd64 --push -t $(CONTAINER) .


.PHONY: test
test:
	# the docker-compose and BuildKit integration is broken, so we need to
	# disable it for now. This also causes caching to become less effective,
	# so uncomment this override whenever the integration is fixed
	COMPOSE_DOCKER_CLI_BUILD=0 docker-compose up -d
	@# don't ask me why docker-compose uses different naming conventions on
	@# mac vs linux :/
ifdef CI
	docker exec django_web_1 pytest
else
	docker exec django-web-1 pytest
endif


.PHONY: deploy
deploy:
ifdef CI
	terraform init -input=false
	terraform apply -auto-approve -input=false
else
	terraform apply
endif

