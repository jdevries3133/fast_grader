# Generated by Django 3.2.6 on 2021-09-22 10:12

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('grader', '0007_auto_20210922_0922'),
    ]

    operations = [
        migrations.RenameModel(
            old_name='Course',
            new_name='CourseModel',
        ),
    ]