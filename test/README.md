System integration tests written with puppeteer and jest. No special access to
the databaase or other backend systems is needed. These tests can be run
against any version of the live site.

This module will also test the integration of the browser extension and the
main site.

# Environment

| Value               | Description            | Default          |
| ------------------- | ---------------------- | ---------------- |
| `FRONTEND_DOMAIN`   | domain of the frontend | `localhost:8000` |
| `FRONTEND_PROTOCOL` | `http` or `https`      | `http`           |
