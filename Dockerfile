FROM rust:1.55

COPY ./ ./


RUN cargo build --release

CMD ["./target/release/ob-web"]