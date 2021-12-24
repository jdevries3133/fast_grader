#!/bin/bash

# This script will bring up the whole system on your local machine. It presumes
# the installation of required dependencies, including the `rn` command line
# utility that I created, which is a shortcut for running parallel processes.

# `rn` is available in https://github.com/jdevries3133/shell_scripts

source $(pwd)/django/venv/bin/activate && \
    rn "python3 $(pwd)/django/manage.py runserver,\
python3 $(pwd)/django/manage.py tailwind start,\
npm --prefix=$(pwd)/extension run dev,\
npm --prefix=$(pwd)/extension run tailwind-dev"
