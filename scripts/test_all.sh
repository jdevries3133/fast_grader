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


# run django and jest test suites

FAILED=0

# django
python3 backend/manage.py test

if [[ $? -ne 0 ]]; then
    FAILED=1
fi


# next.js
npm run test --prefix=$(pwd)/frontend
if [[ $? -ne 0 ]]; then
    FAILED=1
fi

if [[ $FAILED -ne 0 ]]; then
    echo "Test failures occured"
    exit 1
else
    exit 0
fi
