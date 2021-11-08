use feed_rs::parser;
use http::Uri;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use std::fs;

/// An item within a feed
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
struct Bentry {
    pub title: String,
    pub content: String,
    pub time: String,
}

fn extract(html: &Html, keyword: &str) -> Option<String> {
    let article_select = Selector::parse(keyword).unwrap();
    //If we have only one article class, use it
    let articles = html
        .select(&article_select)
        .into_iter()
        .map(|it| it.html())
        .collect::<Vec<_>>();
    if articles.len() == 1 as usize {
        return Some(articles[0].clone());
    }
    None
}

fn convert_image(uri: &str) -> Option<String> {
    println!("preprocess_image: {:?}", uri);
    let resp = reqwest::blocking::get(uri);
    if resp.is_ok() {
        let body = resp.unwrap().bytes();
        if body.is_ok() {
            let image = body.unwrap().to_owned();
            //println!("image: {:?}", image);
            let encoded = base64::encode(&image);
            return Some(encoded);
        }
    }
    None
}

fn preprocess_image(content: &str) -> String {
    let html = Html::parse_document(content);
    let select = Selector::parse("img").unwrap();
    let imgs = html.select(&select);
    let mut result = content.to_string();
    for img in imgs {
        let node = img.value();
        let src = node.attr("src");
        if src.is_some() {
            let r = src.unwrap().parse::<Uri>();
            if r.is_ok() {
                let data = convert_image(&r.unwrap().to_string());
                if data.is_some() {
                    result = result.replace(
                        src.unwrap(),
                        &format!("data:image/jpg;base64,{}", data.unwrap()),
                    );
                }
            }
        }
    }
    result.clone()
}

fn fetch_page(url: &str) -> String {
    let resp = reqwest::blocking::get(url);
    if resp.is_ok() {
        let mut content = String::from("");
        let res = resp.unwrap().text().unwrap();
        let document = Html::parse_document(&res);
        let article = extract(&document, "article");
        if article.is_some() {
            content = article.unwrap();
        }
        content = preprocess_image(&content);
        content
    } else {
        String::from("")
    }
}

fn main() {
    //let resp = reqwest::blocking::get("https://coderscat.com/atom.xml");
    //let resp = reqwest::blocking::get("https://draveness.me/feed.xml");
    let resp = reqwest::blocking::get("https://coolshell.cn/feed");
    //let resp = reqwest::blocking::get("https://blog.rust-lang.org/feed.xml");

    //let resp = reqwest::blocking::get("https://blog.codinghorror.com/rss/");
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
                preprocess_image(&entry.content.unwrap().body.unwrap())
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_article() {
        let html = r#"
        <!DOCTYPE html>
        <meta charset="utf-8">
        <article>Hello, world!</article>
        <h1 class="foo">Hello, <i>world!</i></h1>
    "#;
        let document = Html::parse_document(&html);
        let article = extract(&document, "article");
        assert!(article.is_some());
        assert_eq!(article.unwrap(), "<article>Hello, world!</article>");
    }

    #[test]
    fn test_article_none() {
        let html = r#"
        <!DOCTYPE html>
        <meta charset="utf-8">
        <article>Hello, world!</article>
        <article>Hello, world!</article>
        <h1 class="foo">Hello, <i>world!</i></h1>
    "#;
        let document = Html::parse_document(&html);
        let article = extract(&document, "article");
        assert!(article.is_none());
    }

    #[test]
    fn test_process_image() {
        let html = r#"
        <img src="https://img.draveness.me/2020-10-24-16035525564314/moores-law.png" alt="moores-law" style="width: 50%; height: 100%;">
        "#;
        let processed = preprocess_image(html);
        println!("processed: {:?}", processed);
        assert_eq!(processed.find(".png"), None);
    }
}
