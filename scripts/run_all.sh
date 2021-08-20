#!/bin/bash

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




# run django and next dev servers

### dependency ###
#   please make sure this guy is in your PATH:
#   https://raw.githubusercontent.com/jdevries3133/shell_scripts/main/rn
#   -- It is a super handy script for running parallel tasks without
#   -- bash ampersand chaos
if [[ ! $(which rn) ]]; then
    echo "Please install my thing: https://raw.githubusercontent.com/jdevries3133/shell_scripts/main/rn"
    exit 1
fi

backend_cmd="python3 backend/manage.py runserver"
frontend_cmd="npm run dev --prefix=$(pwd)/frontend"

source backend/venv/bin/activate
rn "$backend_cmd,$frontend_cmd"
