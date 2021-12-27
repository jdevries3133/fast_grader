#!/bin/bash

# This script will bring up the whole system on your local machine. It presumes
# the installation of required dependencies, including the `rn` command line
# utility that I created, which is a shortcut for running parallel processes.

# `rn` is available in https://github.com/jdevries3133/shell_scripts

basedir=$(pwd)

cd django

rn "bash hack/run_devcontainer.sh,\
npm --prefix=$basedir/extension run dev,\
npm --prefix=$basedir/extension run tailwind-dev"
