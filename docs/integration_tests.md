# Integration Tests

System integration tests written with puppeteer and jest. No special access to
the database or other backend systems is needed. These tests can be run
against any version of the live site.

This module will also test the integration of the browser extension and the
main site, although it doesn't currently. Right now, it's just a few very
basic smoke tests.

## Environment Variables

| Value               | Description            | Default          |
| ------------------- | ---------------------- | ---------------- |
| `FRONTEND_DOMAIN`   | domain of the frontend | `localhost:8000` |
| `FRONTEND_PROTOCOL` | `http` or `https`      | `http`           |
