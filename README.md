# Obweb : Obsidian + Web = Obsdian on Mobile and Flomo 

<p align="center">
  <img src="static/logo.png">
</p>

## Motivation

[Obsidian](https://obsidian.md/) and [Flomo](https://flomoapp.com/) are two of my favorite Applications. 

I use Obsidian for knowledge management and Flomo for my thoughts or memos.

But Obsidian don't have a mobile version for Andriod and flomo don't work well with Obsidian. So I decided to create a Web interface for Obsidian, so I can use it on my mobile devices and work in the way of flomo.

And I don't want to store any data on other third-party servers, so here we will deploy this Application on our own server.

## Dev 

+ Backend: Rust + Warp for API 
+ Frontend: Javascript, Bootstrap, JQuery (I'm a novice in Javascript)

Most code is straightforward, there are some hard-coded part. Maybe you need to do some trivial tweaks.
Any PR is welcome to make it better and useful for others.

## Usage

Obweb assume you have your Obsidian repo cloned on the server, and you have permission to push to Git repo. When you are posting things from API, Obweb will push things to remote.

```bash 
git clone http://your-ob-repo ob 
docker-compose up 

//access it on your browser http:://localhost:8005/obweb
```