# Obweb : Obsidian + Web = Obsdian on Mobile + Flomo

<p align="center">
  <img src="static/style/logo.png">
</p>

## Motivation

[Obsidian](https://obsidian.md/) and [Flomo](https://flomoapp.com/) are two of my favorite Applications.

I use Obsidian for knowledge management and Flomo for my thoughts or memos.

But Obsidian don't have a mobile version for Android and flomo don't work well with Obsidian. I decided to create a Web interface for Obsidian, so I can use it on my mobile devices and work in the way of flomo.

I don't want to store any data on other third-party servers, here we will deploy it on our own server.

## Dev

+ Backend: Rust + Warp for API
+ Frontend: Javascript, Bootstrap, JQuery. I'm a novice in Javascript :)

The UI is designed to be more suitable for a mobile device. On PC/Mac, the Obsidian native application is more convenient.

For a MVP, I want to keep it stupid and simple. Most of code is simple and easy to understand, there are some hard-coded part.

Maybe you need to do some trivial tweaks. Any PR is welcome to make it better and useful for others.

## Usage

1. Initialize login accounts

Create `db/accounts.json` with your customed accounts:
```json
[{
    "username": "user name",
    "password": "password"
}]
```

2. Initialize Obsidian repo

Obweb assume you have your Obsidian repo cloned on the server, and you have permission to push to Git repo. When you are posting things from API, Obweb will push changes to remote.

```bash
git clone http://your-ob-repo ob

cd ob
git config user.email "you@example.com"
git config user.name "Your Name"
```

3. Compile and run server

Make sure you have installed [Rust and Cargo](http://rust-lang.org).

```bash
./bin/debug

```
Now you can access it on your browser [http://localhost:8005/obweb](http://localhost:8005/obweb/).

Or you may start with Docker:

```bash
docker-compose up

```

----

**I use this App everyday, hope it will be useful for you.**