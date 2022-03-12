# Architecture

## Abstract

## Goals

See stories for product owner and developer POV.

- low costs
- scalable, portable, cloud-native
- modern frontend
- easy design & UX iteration
- automated CI/CD

## Tech Stack

- Application
  - Language: TypeScript
  - [Remix.run](https://remix.run)
    - this will be the full stack web app
    - prisma will go directly to the database from the remix loader func
    - initially, will deploy in docker inside kubernetes, but can move to
      CloudFlare workers, too
  - JS libraries
    - [Prisma](https://www.prisma.io/)
      - ORM
      - good typing support
      - support for migrations
    - [remix-auth](https://github.com/sergiodxa/remix-auth)
      - API inspired by Passport JS
      - poor documentation, but seems to be used & liked. Code is well-written
  - Testing Stack
    - Cypress, React Testing Library, Jest
- Database: **PosgreSQL**
  - this is one of the only things that will live outside the kubernetes cluster
- CI/CD
  - Docker + Kubernetes + Terraform
    - can run kubernetes on my hardware
    - terraform can manage it
    - can move everything partially or entirely to the cloud when the time is
      right
    - can also set up my own server farm in Clifton, etc. as needed!
  - Can have containers in the cluster running an isolated test environment,
    which users can opt in to using
- RabbitMQ
  - task queue
  - can be used for anticipatory ingress of submission resources while the
    teacher begins their grading session. Worker pool can be scaled easily
    with kubernetes

## Diagram

Architecture diagram is available at ../draw.io/architecture.xml. This file
is viewable with [draw.io.](https://draw.io)

### Node.js API Ingress Workers

Some operations on Google's API is really slow. In particular, exporting
files as plain text is super slow, and we do that frequently for this
application. To avoid the app being as slow as google classroom itself, we
can put jobs to fetch each assignment submission into a task queue, and
service this queue before the teacher starts grading these submissions.

## Next Steps

**CI/CD Tooling**

Although Docker / Terraform / Kubernetes have the ability together to quickly
and easily deploy the project, including setting up system integration testing
environments, they won't just _do that_ without some help. At minimum, GitHub
actions might be good enough to trigger automated tests and automated
deployments. However, a more robust tool like Circle CI or Jenkins might fit
the bill better, depending on what features and out-of-box functionality
they include.

A next step is to research tooling in this area and decide how the actual
pipeline for CI/CD will be set up.
