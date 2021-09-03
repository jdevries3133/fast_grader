# Django

Additional tools and libraries:

- httpx
- tailwind css
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

## Grade Update Problem

I have hit a **major** snag. Namely, it is not possible to update assignments
through the web api that are not associated with my application. See [Google
Classroom Issue Tracker](https://issuetracker.google.com/issues/67748271)

As a result, a convoluted flow will be necessary for actually getting grades
into google classroom:

```text
       User Flow                           Server-Side Flow
┌──────=========                           ================
│
│   ┌────────────────────┐POST          ┌────────────────────────────┐
└───┤grading flow on main├─────────────►│server recieves grading     │
    │site is completed   │              │data, and saves the         │
 ┌──┴────────────────────┘              │information in the database │
 │                                      └────────────────────────────┘
 └──┬────────────────────────┐
    │user is prompted to     │
    │visit Google Classroom, │
    │with a link to the      │
    │specific assignment they│
    │just graded             │
 ┌──┴────────────────────────┘
 │
 │
 └──┬───────────────────────────┐
    │anytime the user opens an  │  GET  ┌──────────────────────────────────┐
    │assignment submission page,├──────►│server responds to the extension's│
    │our *browser extension*    │       │request, providing the grading    │
    │checks for pending         │◄──────┤data pending import, if present   │
    │grading session data that  │       └──────────────────────────────────┘
    │can be imported            │
┌───┴───────────────────────────┘
│
└──┬───────────────────────────┐
   │ if data exists, the       │
   │ extension window will     │
   │ "pop-up" with a big       │
   │ CTA button, asking the    │
   │ user to import the grades │
   │                           │
   │     **user approves       │
   │         import?(y/n)**    │
 ┌─┴─────────────────┬─┬───────┘
 │                   │ │
 │                   │ │      PATCH     ┌───────────────────────────────┐
 │             ┌─────┘ └───────────────►│update the database to mark the│
 │             │                        │session data as rejected and   │
 │             ▼                        │no longer pending import       │
 └──┬──────────────────────────┐        └───────────────────────────────┘
    │the extension will trigger│
    │a content script that     │
    │traverses the DOM and     │
    │inputs grades for the     │
    │user                      │ PATCH  ┌──────────────────────────────────────┐
 ┌──┴──────────────────────────┴──────► │on successful import, update the grade│
 │                                      │data to mark it as accepted and no    │
 │                                      │longer pending import                 │
 │                                      └──────────────────────────────────────┘
 └──┬──────────────────────────┐
    │on successful import,     │
    │"pop-up" the extension    │
    │dialogue again to notify  │
    │the user of success, and  │
    │provide a button for the  │
    │user to return to fast    │
    │grader to continue grading│
    └──────────────────────────┘
```

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

# Pre-Release Chores

- [ ] set up advertising
- [ ] deploy to an auto-scaling service
- [ ] profile the application to ensure that advertising will be profitable
      on its own, and that we need not impose additional limits

# Detail on Post-Release and Premium Features

### Data Model

Although the application will primarily be an intermediary between the user
and their google data, we will still need our own database to manage user
permissions and subscriptions.

### Rich Data?

Turns out we can easily export docs to any MIME type, presumably including
text/html. So, it might be trivial to create a rich data view:

[docs](https://developers.google.com/resources/api-libraries/documentation/drive/v3/python/latest/drive_v3.files.html#export)

### Security

The XSS vulnerabilities noted in [htmx's security
documentation](https://htmx.org/docs/#security) needs to be protected against.
Maybe there is a library for this already?

### Nicities

- Sorting and filtering by assignment type
- Returning all unsubmitted assignments with a zero and a single comment
- Email the student and/or parents directly from the app with "e" to write a
  student-directed email or "E" for student and parent(s) according to the
  contact information in google classroom
- Save comment bank
- Keyboard shortcut for jumping to a specific student
- Grade the same assignment _across_ multiple classrooms
