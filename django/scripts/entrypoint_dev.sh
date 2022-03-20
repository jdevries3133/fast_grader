#!/bin/sh

apk add nodejs npm
python3 manage.py tailwind install
python3 manage.py tailwind start &

python3 manage.py makemigrations --no-input
python3 manage.py migrate --no-input
python3 manage.py collectstatic --no-input


if [[ $DEBUGGING == 'true' ]];
then
    while true;
    do
        sleep 1;
    done
fi

exec python3 manage.py runserver 0.0.0.0:8000
