# Help

temp

I am chunking the project into issues on the [issues tab
](https://github.com/jdevries3133/fast_grader/issues). Start there if you
want to help. Find something you can do, leave a comment on the issue, and
get started! If you are new to open source contributing, there are lots of
guides and tutorials to help you through the _issue => fork => pull request_
workflow, like [this one
](https://github.com/firstcontributions/first-contributions)

# `./misc` (what are we doing here)

Look in the `./misc` folder for the plan.

# Set `$DJANGO_DEBUG`

Set the `DJANGO_DEBUG` environment variable to any truthy value. This not only
puts django into debug mode, but also uses separate development settings in
`fast_grader/settings/development.py`.

# Coverage Report

Run the following:

```bash
coverage run --source "." manage.py test \
  && coverage html --omit "venv/*,fast_grader/*sgi.py,fast_grader/manage.py" \
  && open htmlcov/index.html
```
