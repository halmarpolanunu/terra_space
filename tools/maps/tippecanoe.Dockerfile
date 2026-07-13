FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install --yes --no-install-recommends build-essential libsqlite3-dev zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src
COPY . .
RUN make -j"$(nproc)"

ENV PATH="/src:${PATH}"
