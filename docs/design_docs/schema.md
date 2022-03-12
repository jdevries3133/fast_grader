# Database Schema

## Abstract

Having our own database will make the application more responsive and
performant. For LMSs like Google Classroom, which require the browser extension
for grade syncing, it is necessary for us to persist information from grading
time to syncing time. Moreover, storing grading data in a relational database
provides us with opportunities to build out products from that data, like tools
to give teachers and school districts better insights into the data passing
through our platform.

## Goals & Responsibilities

- provide data storage that reflects the needs of the fast grader application
- avoid storing extra irrelevant information, which would make integration with
  multiple LMSs more complicated

## Specification

See schema chart at ../schema.xml. This file can be viewed with
[draw.io](https://draw.io)
