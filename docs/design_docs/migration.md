# Migration

## Abstract

We need to migrate from the old to the new architecture as the universal
adapter API is built out, and we start to create the bones of the new system.
We will do this without bringing down the current site, and by making steady
incremental changes to the codebase.

## Plan

In broad strokes, the migration will follow these steps:

- [x] bring the extension into the main repository, creating a monorepo
- [x] wrap the current backend in Docker
- [x] wrap the docker container in kubernetes
- [x] define the kubernetes cluster with Terraform
- [x] create remote Kubernetes cluster on `big-boi`
- [x] create postgresql db as shown in architecture diagram
- [ ] create CI/CD pipelines
- [ ] deploy that much to an on-prem cluster
- [ ] start the Remix.run project from boilerplate, and define CI/CD processes
- [ ] when new landing page and signup form are complete, deploy it to
      `classfast.app`, and move the current site to `alpha.classfast.app` or
      similar
- [ ] create cron script to copy & transform data from old to new platform
- [ ] build out new site while eliminating all Django / Python code
