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

# Generated by Django 3.2.8 on 2021-12-07 13:00

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("grader", "0010_auto_20211205_2353"),
    ]

    operations = [
        migrations.AlterField(
            model_name="assignmentsubmission",
            name="_profile_photo_url",
            field=models.CharField(blank=True, default="", max_length=200),
        ),
        migrations.AlterField(
            model_name="assignmentsubmission",
            name="student_name",
            field=models.CharField(blank=True, default="", max_length=200),
        ),
    ]
