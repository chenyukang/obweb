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
    let select = Selector::parse(keyword).unwrap();
    //If we have only one article class, use it
    let mut elems = html
        .select(&select)
        .into_iter()
        .map(|it| it.html())
        .collect::<Vec<_>>();
    elems.sort_by(|a, b| b.len().cmp(&a.len()));
    if elems.len() > 0 {
        return Some(elems[0].clone());
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
    println!("fetch_page: {:?}", url);
    let resp = reqwest::blocking::get(url);
    if resp.is_ok() {
        let res = resp.unwrap().text().unwrap();
        let document = Html::parse_document(&res);
        let article = extract(&document, "article");
        let mut content = if article.is_some() {
            article.unwrap()
        } else {
            extract(&document, "body").unwrap_or(res.clone())
        };
        content = preprocess_image(&content);
        content
    } else {
        println!("error: {:?}", resp);
        String::from("")
    }
}

fn fetch_feed(feed: &str) -> Option<i32> {
    let resp = reqwest::blocking::get(feed);
    let body = resp.unwrap().text();
    if body.is_err() {
        return None;
    }
    let feed = parser::parse(body.unwrap().as_bytes()).unwrap();
    println!("title: {:?}", feed.title);
    //println!("feed: {:?}", feed);
    let mut succ_count = 0;
    for entry in feed.entries {
        let entry_title = entry.title.unwrap();
        let _published_time = entry.published.unwrap();
        let link = if entry.links.len() > 0 {
            let l = &entry.links[0];
            l.href.clone()
        } else {
            String::from("")
        };
        let mut content = String::new();
        if entry.content.is_some() {
            content = preprocess_image(&entry.content.unwrap().body.unwrap())
        } else if link != "" {
            content = fetch_page(&link)
        };
        let path = format!("./rss/{}.html", entry_title.content);
        println!("link: {} {}", link, content.len());
        if content.len() > 0 {
            fs::write(&path, &content).unwrap();
            succ_count += 1;
        } else {
            println!("error: {}", entry_title.content);
        }
    }
    Some(succ_count)
}

fn main() {
    //let resp = reqwest::blocking::get("https://coderscat.com/atom.xml");
    //let resp = reqwest::blocking::get("https://draveness.me/feed.xml");
    //let resp = reqwest::blocking::get("https://coolshell.cn/feed");
    //let resp = reqwest::blocking::get("https://blog.rust-lang.org/feed.xml");

    // https://www.elidedbranches.com/rss.xml

    //let feed = "https://blog.codinghorror.com/rss/";
    let feed = "https://blog.janestreet.com/feed.xml";
    let _ = fetch_feed(feed);
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
    fn test_article_in_body() {
        let html = r#"
        <!DOCTYPE html>
        <body>
        <meta charset="utf-8">
        <article>Hello, world!</article>
        <h1 class="foo">Hello, <i>world!</i></h1>
        </body>
    "#;
        let document = Html::parse_document(&html);
        let article = extract(&document, "article");
        assert!(article.is_some());
        assert_eq!(article.unwrap(), "<article>Hello, world!</article>");
    }

    #[test]
    fn test_articles() {
        let html = r#"
        <!DOCTYPE html>
        <meta charset="utf-8">
        <article>Hello, world!</article>
        <article>Hello, world now!</article>
        <h1 class="foo">Hello, <i>world!</i></h1>
    "#;
        let document = Html::parse_document(&html);
        let article = extract(&document, "article");
        assert!(!article.is_none());
        assert_eq!(article.unwrap(), "<article>Hello, world now!</article>");
    }

    #[test]
    fn test_process_image() {
        let img = "https://coderscat.com/css/images/logo.png";
        let html = format!(
            "<img src=\"{}\" alt=\"moores-law\" style=\"width: 50%; height: 100%;\">",
            img
        );
        let processed = preprocess_image(&html);
        assert_eq!(processed.find(".png"), None);
        assert!(processed.find("base64").is_some());
        let converted_image = convert_image(img);
        assert!(converted_image.is_some());
        assert!(processed.contains(&converted_image.unwrap()));
    }

    #[test]
    fn test_fetch_page() {
        let url = "https://blog.janestreet.com/ocaml-4-03-everything-else/";
        let content = fetch_page(url);
        assert!(!content.contains("<body>"));
    }
}
