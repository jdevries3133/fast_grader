# Email

Notes and details about the implementation of the mailing system.

## Mailu

We were using mailu, but it isn't portable to a kubernetes environment, so
I am currently looking at [docker-mailserver](https://docker-mailserver.github.io/docker-mailserver/edge/)
instead.

## Kubernetes Integration (or lack thereof)

Mailu runs in docker-compose on the main server, separately from the Kubernetes
cluster. Mailu was created to run in docker-compose, and it's adaptation for
Kubernetes seems fraught and somewhat unmaintained compared to the main
docker-compose distribution.

Instead of trying to run mailu in kubernetes, traffic is routed through the
kubernetes cluster with the help of [the microk8s metallb
add-on.](https://microk8s.io/docs/addon-metallb)

## Architecture

```
mail.classfast.app DNS rules
      │
      ▼
┌───────────────────┐
│ HAProxy at OSI    │
│ layer 4 running on│
│ AWS ec2 micro VM  │
└─────┬─────────────┘
      │
      ▼
┌──────────────────────────────┐
│ metallb ingress rule in main |
│ cluster forwards traffic     |
└─────┬────────────────────────┘
      │
      ▼
┌───────────────────────┐
│ mailu app, on big-boi │
│ host                  |
└───────────────────────┘
```
