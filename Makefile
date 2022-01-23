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



# -----------------------------------------------------------------------------
# Only contains one rule: deploy. There are three possible deploy modes:
#
# - dev
# - prod
# - stage
#
# These deploy modes refer to the subdirectories in ./tf, which is where
# infrastructure is defined, but the deploy rule will step into other projects
# to perform pre-deploy steps as necessary.

TAG=develop-latest
MODE=dev

.PHONY: pre-deploy
pre-deploy:
	# the push rule on the makefile in ./django will also cleanup, build, and
	# test
	cd django && TAG=$(TAG) make push


# helpful for when you've already pushed a good container, and you just want
# to work on the terraform deployment
quick-deploy:
	cd tf/$(MODE) && terraform apply \
		-auto-approve \
		-var "django_container_tag=$(TAG)" \

.PHONY: deploy
deploy: pre-deploy quick-deploy
