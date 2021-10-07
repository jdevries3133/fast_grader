#!/bin/bash

# script for automated deployments

systemctl stop fastgrader.service
git checkout main
git pull origin main
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
python3 manage.py tailwind install
python3 manage.py tailwind build
python3 manage.py collectstatic --noinput
python3 manage.py makemigrations --noinput
python3 manage.py migrate --noinput
python3 manage.py test
systemctl start fastgrader.service
