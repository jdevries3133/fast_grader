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

from datetime import datetime

from django.shortcuts import render

def profile(request):
    """This is where the user will be able to view and export previous grading
    sessions."""
    return render(request, 'accounts/profile.html', context={
        'submissions': [
            {
                'time': datetime(2020, 5, 23).date(),
                'course': 'Math 4C',
                'assignment': 'Peter Piper Picked a Pickled Pepper',
                'averageGrade': 12.4,
                'maxGrade': 15
            },
            {
                'time': datetime(2020, 2, 10).date(),
                'course': 'Science 3B',
                'assignment': 'How to do a lab coat thing that is important',
                'averageGrade': 87,
                'maxGrade': 100
            }
        ]
    })
