use chrono::{DateTime, Utc};
use feed_rs::parser;
use serde::{Deserialize, Serialize};
use std::fs;

/// An item within a feed
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
struct Bentry {
    pub title: String,
    pub content: String,
    pub time: String,
}

fn fetch_page(url: &str) -> String {
    let resp = reqwest::blocking::get(url);
    if resp.is_ok() {
        let res = resp.unwrap().text().unwrap();
        let main_left = res.find("<article ");
        let main_right = res.find("</article>");
        if main_left.is_some() && main_right.is_some() {
            let main_left = main_left.unwrap();
            let main_right = main_right.unwrap();
            return res[main_left..main_right + 10].to_string();
        }
        res
    } else {
        String::from("")
    }
}

fn main() {
    //let resp = reqwest::blocking::get("https://coderscat.com/atom.xml");
    //let resp = reqwest::blocking::get("https://draveness.me/feed.xml");
    //let resp = reqwest::blocking::get("https://coolshell.cn/feed");
    //let resp = reqwest::blocking::get("https://blog.rust-lang.org/feed.xml");

    let resp = reqwest::blocking::get("https://blog.codinghorror.com/rss/");
    let body = resp.unwrap().text();
    if body.is_ok() {
        let feed = parser::parse(body.unwrap().as_bytes()).unwrap();
        println!("title: {:?}", feed.title);
        println!("feed: {:?}", feed);
        for entry in feed.entries {
            let entry_title = entry.title.unwrap();
            let published_time = entry.published.unwrap();
            let link = if entry.links.len() > 0 {
                let l = &entry.links[0];
                l.href.clone()
            } else {
                String::from("")
            };
            let content = if entry.content.is_some() {
                entry.content.unwrap().body.unwrap().clone()
            } else {
                if link != "" {
                    fetch_page(&link)
                } else {
                    String::from("")
                }
            };
            let path = format!("./rss/{}.html", entry_title.content);
            let _bentry = Bentry {
                title: entry_title.content,
                content: content.clone(),
                time: published_time.to_rfc2822(),
            };
            println!("link: {}", link);
            //let json = serde_json::to_string(&bentry);
            fs::write(&path, &content).unwrap();
        }
    }
}
