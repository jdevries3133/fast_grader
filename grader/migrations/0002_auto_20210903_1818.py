# Generated by Django 3.2.6 on 2021-09-03 18:18

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('grader', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='GradingSession',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('api_course_id', models.CharField(max_length=50)),
                ('api_assignment_id', models.CharField(max_length=50, unique=True)),
                ('max_grade', models.IntegerField()),
                ('teacher_template', models.TextField(null=True)),
            ],
        ),
        migrations.AlterField(
            model_name='assignmentsubmission',
            name='assignment',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='submissions', to='grader.gradingsession'),
        ),
        migrations.DeleteModel(
            name='Assignment',
        ),
    ]
