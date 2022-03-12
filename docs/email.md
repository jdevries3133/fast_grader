# Email

Notes and details about the implementation of the mailing system.

## Mailu

We were using mailu, but it isn't portable to a kubernetes environment, so
I am currently looking at [docker-mailserver](https://docker-mailserver.github.io/docker-mailserver/edge/)
instead.

## Architecture

```
all traffic
      │
      │
      │
      │
      │
      ▼
 mail.classfast.app
┌───────────────────┐
│ HAProxy at        │
│ OSI layer 4       │ ◄────────── DNS, including reverse DNS via AWS,
│                   │             can point to the proxy
└─────┬─────────────┘
      │
      │
      │
      ▼
 mail-backend.classfast.app  ** DNS is used so that in case
┌───────────────────┐        ** my apartment IP address changes,
│ mailu app, on     │        ** I can just update the DNS registration
│ same machine as   │        ** to maintain the connection between
│ main site         │        ** the AWS proxy and apartment
│                   │
└───────────────────┘
```
