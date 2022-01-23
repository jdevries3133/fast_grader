FROM python:3.10.1-alpine3.15 as prep-dependencies

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1


# -- build dependencies
RUN apk update && apk upgrade
RUN apk add --no-cache \
    curl \
    nodejs \
    npm \
    build-base \
    libffi-dev \
    postgresql-dev \
    python3-dev \
    musl-dev \
    openssl-dev

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH=$PATH:/root/.cargo/bin

# -- compile & install python (pip) dependencies
WORKDIR /src
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install --user -r requirements.txt

COPY . .

ENV DJANGO_SECRET="some value for now; will be unset in the next build stage"
RUN python3 manage.py tailwind install
RUN python3 manage.py tailwind build
RUN python3 manage.py collectstatic



### second stage for runtime dependencies only ###

FROM python:3.10.1-alpine3.15 as create-runtime

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# python runtime dependencies
RUN apk add --no-cache \
    libffi-dev \
    postgresql-dev \
    python3-dev \
    musl-dev \
    openssl-dev

WORKDIR /src

# this copies previously installed and compiled python (pip) dependencies
COPY --from=prep-dependencies /root/.local /root/.local
ENV PATH=$PATH:/root/.local/bin

# copy project source code, including static build artifacts
COPY --from=prep-dependencies /src .


CMD [ "sh", "/src/entrypoint_prod.sh" ]
