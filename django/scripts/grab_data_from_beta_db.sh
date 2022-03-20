#!/bin/sh

# Extract data from dev db and insert it into the development db

LOCAL_CONTAINER="django_web_1"

# export data from kubernetes
echo "getting data from kubernetes"
pod=$(kubectl get pods -n fast-grader-beta -o custom-columns=":metadata.name" | grep fast-grader-beta-deployment | head -n 1)
pod=$(echo $pod | sed -e 's/^[[:space:]]*//')
kubectl exec -n fast-grader-beta $pod -- python3 manage.py dumpdata > ~data.json

# import into docker container
echo "importing data into docker"
docker cp ~data.json $LOCAL_CONTAINER:/src/data.json
docker exec $LOCAL_CONTAINER python3 manage.py loaddata data.json

# cleanup
echo "cleaning up"
docker exec $LOCAL_CONTAINER rm data.json
rm ~data.json

# the SocialApp stores oauth credentials. We need to delete it from the database
# data, otherwise things will get wonky. There should be different credentials
# in the .env file locally, which will get written to the database by the
# SocialAccountAdapter in ../accounts/socialaccount_adapter.py on the first
# relevant request
docker exec $LOCAL_CONTAINER python3 manage.py shell -c \
    "from allauth.socialaccount.models import SocialApp; SocialApp.objects.all().delete()"
