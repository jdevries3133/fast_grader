# Generated by Django 3.2.6 on 2021-10-23 16:36

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("grader", "0002_alter_gradingsession_max_grade"),
    ]

    operations = [
        migrations.AddField(
            model_name="assignmentsubmission",
            name="profile_photo_url",
            field=models.CharField(max_length=200, null=True),
        ),
    ]