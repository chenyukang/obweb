# rss-rs

A dead simple, yet powerful, RSS reader written in Rust.

## Usage

- start the server

Add a feed file in `md/feed.md`, one line for one each feed and run the server.

```bash
$ ./target/debug/rss-rs
```
visit `http://localhost:8005/read` for reading.

- start in daemon mode
when server is running in daemon mode, it will check the feed file every 20 minutes and update the feed list.

```bash
$ ./target/debug/rss-rs -d
```

- stop the server

```bash
$ ./target/debug/rss-rs -s
```
