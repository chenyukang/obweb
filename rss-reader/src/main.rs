use chrono::prelude::*;
use clap::App;
use feed_rs::parser;
use http::Uri;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use std::fs;

/// An item within a feed
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
struct Page {
    pub title: String,
    pub publish_datetime: String,
    pub link: String,
    pub source: String,
    pub website: String,
    pub readed: bool,
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

fn preprocess_image(content: &str, website: &str) -> String {
    let html = Html::parse_document(content);
    let select = Selector::parse("img").unwrap();
    let imgs = html.select(&select);
    let mut result = content.to_string();
    for img in imgs {
        let node = img.value();
        let src = node.attr("src");
        if let Some(url) = src {
            let full_url = if url.starts_with("http://") || url.starts_with("https://") {
                url.to_string()
            } else {
                format!("{}/{}", website, url)
            };
            let r = full_url.parse::<Uri>();
            if r.is_ok() {
                let data = convert_image(&r.unwrap().to_string());
                if let Some(d) = data {
                    result = result.replace(&src.unwrap(), &format!("data:image/jpg;base64,{}", d));
                }
            }
        }
    }
    result.clone()
}

fn fetch_page(url: &str) -> String {
    println!("fetch_page: {:?}", url);
    if url.is_empty() {
        return String::default();
    };
    let resp = reqwest::blocking::get(url);
    if resp.is_ok() {
        let res = resp.unwrap().text().unwrap();
        let document = Html::parse_document(&res);
        let article = extract(&document, "article");
        if let Some(r) = article {
            r
        } else {
            extract(&document, "body").unwrap_or(res.clone())
        }
    } else {
        println!("error: {:?}", resp);
        String::from("")
    }
}

fn fetch_feed(feed: &str, pages: &mut Vec<Page>) -> Option<i32> {
    println!("fetch_feed: {:?}", feed);
    let resp = reqwest::blocking::get(feed);
    if resp.is_err() {
        return None;
    }
    let body = resp.unwrap().text();
    if body.is_err() {
        return None;
    }
    let feed_resp = parser::parse(body.unwrap().as_bytes()).unwrap();
    println!("title: {:?}", feed_resp.title);
    let website = if let Some(l) = feed_resp.links.get(0) {
        l.href.clone()
    } else {
        String::default()
    };
    let mut succ_count = 0;
    for entry in feed_resp.entries {
        let entry_title = entry.title.unwrap().content.replace("/", "|");
        let published_time = entry
            .published
            .unwrap_or(entry.updated.unwrap_or(Utc::now()));
        let link = if let Some(l) = entry.links.get(0) {
            l.href.clone()
        } else {
            String::default()
        };
        println!("link: {}", link);
        let page_exist = pages
            .iter()
            .any(|p| p.link == link && p.title == entry_title);

        if page_exist {
            println!("link: {} cached", link);
            continue;
        }
        let mut content = if let Some(ct) = entry.content {
            ct.body.unwrap()
        } else {
            fetch_page(&link)
        };

        let path = format!("./rss/{}.html", entry_title);
        content = preprocess_image(&content, &website);
        let page = Page {
            link: link.clone(),
            website: website.clone(),
            publish_datetime: published_time.to_string(),
            title: entry_title.clone(),
            readed: false,
            source: feed.to_string(),
        };

        if content.len() > 0 {
            fs::write(&path, &content).unwrap();
            pages.push(page.clone());
            let dump_json = serde_json::to_string(&pages);
            if dump_json.is_ok() {
                let _ = fs::write("./db/pages.json", &dump_json.unwrap());
            }
            succ_count += 1;
        } else {
            println!("error: {}", entry_title);
        }
    }
    Some(succ_count)
}

fn update_rss() {
    let page_buf = fs::read_to_string("./db/pages.json").unwrap_or(String::from("[]"));
    let mut pages: Vec<Page> = serde_json::from_str(&page_buf).unwrap();
    let rss_buf = fs::read_to_string("./db/config").unwrap();
    let rss = rss_buf
        .split("\n")
        .map(|l| l.trim())
        .filter(|&l| l.len() > 0)
        .collect::<Vec<_>>();
    for feed in rss {
        let _ = fetch_feed(feed, &mut pages);
    }
}

fn main() {
    let matches = App::new("Rss-reader")
        .version("0.1")
        .author("yukang <moorekang@gmail.com>")
        .about("Rss Reader in Rust")
        .arg("-u, --update    'Update and fetch rss'")
        .get_matches();

    let update = matches.occurrences_of("update");
    if update > 0 {
        update_rss();
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
        let processed = preprocess_image(&html, "");
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
