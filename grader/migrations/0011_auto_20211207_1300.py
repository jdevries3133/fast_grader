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