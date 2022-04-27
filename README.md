# Obweb : Obsidian + Web = Obsdian on Mobile + Flomo

<p align="center">
  <img src="front/public/logo.png">
</p>

## Motivation

Introduction in Chinese: [打造自己的工具](http://chenyukang.github.io/2021/11/28/intro-to-obweb.html)

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

Obweb is a classic single page Web application:

<p align="center">
  <img src="http://chenyukang.github.io/images/ob_pasted-image-20211127144951.png">
</p>

+ Backend: JavaScript/Koa for API
+ Frontend: JavaScript, Bootstrap, JQuery, svelte. I'm a novice in Frontend :)

For a MVP, I want to keep it stupid and simple. Most of code is simple and easy to understand, there are some hard-coded parts.

Maybe you need to do some trivial tweaks. Any PR is welcome to make it better and useful for others.

## Usage

### 1. Initialize Obsidian repo

There is a plugin [Obsidian Git](https://github.com/denolehov/obsidian-git) to help you sync you Obsidian vault with remote repository.

Obweb assume you have your Obsidian repository is cloned on the deploying server, and you have the permission of Git pull/push. When you are posting things from API, Obweb will push changes to remote.

```bash
git clone http://your-ob-repo ob

cd ob
git config user.email "you@example.com"
git config user.name "Your Name"
```

## 2. Run the server
Obweb assume your Obsidian vault has `Daily` and `Unsort` directories to store daily memos and unsorted notes.

```bash
./bin/dev.sh
```

### 3. Post configuration

If you have your own domain, you can deploy it to a custom domain. You may want to add some other security enhancement such as HTTPS, request frequency limit, etc.

If you want to add authorization with an account and password, you may add username and password in `default.json`:

```json
"user": "xxxxx",
"pass": "xxxxx",
```

----

**I use this App everyday, hope it will be useful for you.**

