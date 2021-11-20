# Obweb : Obsidian + Web = Obsdian on Mobile + Flomo

<p align="center">
  <img src="front/public/logo.png">
</p>

## Motivation

[Obsidian](https://obsidian.md/) and [Flomo](https://flomoapp.com/) are two of my favorite Applications.

I use Obsidian for knowledge management and Flomo for daily thoughts or memos.

But Flomo don't work well with Obsidian. I decided to create a Web interface for Obsidian, so I can use it on my mobile devices and work in a mixed way of Obsidian and flomo.

Here are the principles of this project:

1. The UI is designed to be more suitable for a mobile device. On PC/Mac, the Obsidian native application is more convenient than Web Applications.

2. We won't do complicated editing operations on the mobile end, in most scenarios, we create simple note and memos in daily life, but we can use `link` in Obsidian to build connections between notes.

3. Keep everything simple, plain Markdown is preferable. Git as database and no other deps.

4. We don't want to store any data on other third-parties, here we will deploy it on our own server.

5. There is a simple but workable RSS reader

## Development

+ Backend: Rust + Warp for API
+ Frontend: JavaScript, Bootstrap, JQuery, svelte. I'm a novice in Frontend :)

For a MVP, I want to keep it stupid and simple. Most of code is simple and easy to understand, there are some hard-coded parts.

Maybe you need to do some trivial tweaks. Any PR is welcome to make it better and useful for others.

## Deployment

1. Initialize Obsidian repo

There is a plugin [Obsidian Git](https://github.com/denolehov/obsidian-git) to help you sync you Obsidian vault with remote repository.

Obweb assume you have your Obsidian repository is cloned on the deploying server, and you have the permission of Git pull/push. When you are posting things from API, Obweb will push changes to remote.

```bash
git clone http://your-ob-repo ob

cd ob
git config user.email "you@example.com"
git config user.name "Your Name"
```
Obweb assume your Obsidian vault has `Daily` and `Unsort` directories to store daily memos and unsorted notes.

2. Compile and run

Make sure you have installed [Rust and Cargo](http://rust-lang.org), and then run:

```bash
./bin/debug.sh
```

Now you can access it on your browser [http://localhost:8005/obweb](http://localhost:8005/obweb/).

You may start with Docker:

```bash
docker-compose up
```

3. Post configuration

If you have your own domain, you can deploy it to a custom domain. You may want to add some other security enhancement such as HTTPS, request frequency limit, etc.

If you want to add authorization with an account and password, you may run:

```bash
./target/debug/obweb -c
```

The encrepted account information will be stored in file `./db/accounts`.
----

**I use this App everyday, hope it will be useful for you.**

