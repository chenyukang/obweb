FROM rust:1.55

RUN USER=root cargo new --bin ob-web
WORKDIR /ob-web

COPY ./Cargo.lock ./Cargo.lock
COPY ./Cargo.toml ./Cargo.toml

RUN rm src/*.rs

COPY ./src ./src

RUN cargo install --path .

COPY ./front ./front
