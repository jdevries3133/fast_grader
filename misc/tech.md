# Next.js Frontend

Additional tools and libraries:

- typescript
- tailwind css
- redux
- payment (stripe?)
- jest / react testing library

# Django / Django REST Framework Backend

Additional tools and libraries:

- django-allauth
- google api client libraries

# Implementation Planning Notes

I am currently working towards an alpha release, which will include limited
features. The alpha build will be able to:

1. limit access to the product via email login
2. use the main grading view on desktop.
3. implement analytics to measure API consumption per user
4. implement auto-scaling via kubernetes and docker

# Detail on Alpha Features

### Limit Access

> limit access to the product via email login

It is ok if this is quick and hacky and the authentication flow can be jank.
We just need a way to control the amount of users using the alpha and also have
enough security that our application API cannot be easily hijacked or abused.

### Main Grading View

> use the main grading view on desktop.

This is the core and most critical functionality of the project. It should
work and work well, because it is here to stay.

### Analytics

> implement analytics to measure API consumption per user

### Scalability

> implement auto-scaling via kubernetes and docker

If it is possible for th site to turn a profit, we definitely want it to scale
automatically and do its thing.

# Detail on Beta Features

### Data Model

Although the application will primarily be an intermediary between the user
and their google data, we will still need our own database to manage user
permissions and subscriptions.
