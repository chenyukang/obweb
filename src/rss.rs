use chrono::prelude::*;
use feed_rs::parser;
use http::Uri;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use sha2::Digest;
use std::fs;
use std::path::Path;

static PAGES_DB: &'static str = "./db/pages.json";

/// An item within a feed
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Page {
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

fn remove_element(content: &str, keyword: &str) -> String {
    let html = Html::parse_document(content);
    let select = Selector::parse(keyword).unwrap();
    let mut result = html.root_element().html().to_string();
    //println!("result: {:?}", result);
    html.select(&select).for_each(|it| {
        let unescaped = it.html();
        //println!("unescaped: {:?}", unescaped);
        assert!(result.contains(&unescaped));
        result = result.replace(&unescaped, "")
    });
    return result;
}

fn gen_image_name(uri: &str) -> String {
    let digest = sha2::Sha256::digest(uri.as_bytes());
    let mut hex = String::new();
    for byte in digest.iter() {
        hex.push_str(&format!("{:02x}", byte));
    }
    let len = usize::min(10, hex.len());
    let hex_str = &hex[0..len].to_string();
    let index = uri.chars().position(|c| c == '?').unwrap_or(uri.len());
    let cleaned_uri = uri[..index].to_string();
    let elems = cleaned_uri.split("/").into_iter().collect::<Vec<_>>();
    let image_name = elems.last().unwrap().to_string();
    format!("{}_{}", hex_str, image_name)
}

fn convert_image(uri: &str) -> Option<String> {
    println!("preprocess_image: {:?}", uri);
    let dir = "./pages/images";
    let _ = fs::create_dir_all(dir);
    let image_path = format!("{}/{}", dir, gen_image_name(uri));
    //let ret_path = image_path.replace("./pages", "");
    if Path::new(&image_path).exists() {
        return Some(image_path.clone());
    }
    let resp = reqwest::blocking::get(uri);
    if resp.is_ok() {
        let body = resp.unwrap().bytes();
        if body.is_ok() {
            let image = body.unwrap().to_owned();
            //println!("image: {:?}", image);
            let res = fs::write(&image_path, &image);
            if res.is_ok() {
                return Some(image_path.clone());
            } else {
                return None;
            }
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
                    result = result.replace(&src.unwrap(), &d.replace("./", "/"));
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

fn fetch_feed(feed: &str, pages: &Vec<Page>, force: bool) -> Option<i32> {
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
    let mut website = String::new();
    for link in feed_resp.links {
        if link.href.starts_with("http") {
            website = link.href;
            break;
        }
    }
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

        if page_exist && !force {
            println!("link: {} cached", link);
            continue;
        }
        let mut content = if let Some(ct) = entry.content {
            ct.body.unwrap()
        } else {
            let descrption = entry.summary;
            if descrption.is_some() {
                descrption.unwrap().content
            } else {
                fetch_page(&link)
            }
        };
        content = preprocess_image(&content, &website);
        content = remove_element(&content, "footer");
        content = remove_element(&content, "header");
        let page = Page {
            link: link.clone(),
            website: website.clone(),
            publish_datetime: published_time.to_string(),
            title: entry_title.clone(),
            readed: false,
            source: feed.to_string(),
        };

        if content.len() > 0 {
            let path = format!("./pages/{}.html", entry_title);
            fs::write(&path, &content).unwrap();
            dump_new_pages(&page);
            succ_count += 1;
        } else {
            println!("error: {}", entry_title);
        }
    }
    Some(succ_count)
}

pub fn cur_pages() -> Vec<Page> {
    let page_buf = fs::read_to_string(PAGES_DB).unwrap_or(String::from("[]"));
    serde_json::from_str(&page_buf).unwrap()
}

pub fn update_rss(feed: Option<&str>, force: bool) {
    let pages = cur_pages();
    let rss_buf = fs::read_to_string("./ob/Unsort/feeds.md").unwrap();
    let feeds = rss_buf
        .split("\n")
        .map(|l| l.trim())
        .filter(|&l| l.len() > 0)
        .collect::<Vec<_>>();
    if let Some(f) = feed {
        let _ = fetch_feed(f, &pages, true);
    } else {
        for feed in feeds.iter() {
            println!("force: {:?}", force);
            let _ = fetch_feed(*feed, &pages, force);
        }
    }

    let pages = cur_pages();
    let filtered_pages = pages
        .iter()
        .filter(|&p| feeds.contains(&p.source.as_str()))
        .map(|p| p.clone())
        .collect::<Vec<Page>>();
    dump_pages(&filtered_pages);
}

pub fn dump_pages(pages: &Vec<Page>) {
    let dump_json = serde_json::to_string(&pages);
    if dump_json.is_ok() {
        fs::write(PAGES_DB, &dump_json.unwrap()).unwrap();
    }
}

fn dump_new_pages(page: &Page) {
    let page_buf = fs::read_to_string(PAGES_DB).unwrap_or(String::from("[]"));
    let mut pages: Vec<Page> = serde_json::from_str(&page_buf).unwrap();
    let page_exist = pages.iter().any(|p| p.link == page.link);
    if !page_exist {
        pages.push(page.clone());
        dump_pages(&pages);
    }
}

pub fn clear_for_feed(feed: &str) {
    let page_buf = fs::read_to_string(PAGES_DB).unwrap_or(String::from("[]"));
    let pages: Vec<Page> = serde_json::from_str(&page_buf).unwrap();
    let filted_pages = pages
        .iter()
        .filter(|p| p.source != feed)
        .map(|p| p.clone())
        .collect::<Vec<_>>();
    dump_pages(&filted_pages);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_url_base() {
        assert!(gen_image_name("http://abc/d/x/demo.png").ends_with("_demo.png"));
        assert!(gen_image_name("http://abc/d/x/demo.png?ab=1&c=3").ends_with("_demo.png"));
        assert!(gen_image_name("/demo.png?ab=1&c=3").ends_with("_demo.png"));
        assert!(gen_image_name("//demo.jpg").ends_with("demo.jpg"));
        assert!(gen_image_name("http://abc.com/demo.jpg?/test/").ends_with("demo.jpg"));
    }

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
    fn test_remove_element() {
        let html = r#"
        <!DOCTYPE html>
        <body>
        <meta charset="utf-8">
        <footer>Hello, world!</footer>
        <h1 class="foo">Hello, <i>world!</i></h1>
        </body>
    "#;
        let res = remove_element(html, "footer");
        assert!(!res.contains("<footer>"));
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
        assert!(processed.find("logo.png").is_some());
    }

    #[test]
    fn test_fetch_page() {
        let url = "https://blog.janestreet.com/ocaml-4-03-everything-else/";
        let content = fetch_page(url);
        assert!(!content.contains("<body>"));
    }

    #[test]
    fn test_fetch_page_remove_footer() {
        let url = "https://yihui.org/cn/2021/07/injuries/";
        let mut content = fetch_page(url);
        assert!(content.contains("<footer>"));
        content = remove_element(&content, "footer");
        assert!(!content.contains("<footer>"));
    }

    #[test]
    fn test_fetch_page_images() {
        let uri = "https://yihui.org/cn/2020/07/wild-onion/";
        let mut content = fetch_page(uri);
        content = preprocess_image(&content, uri);
        let _ = fs::write("./pages/tmp.html", &content);
        assert!(content.contains("/images/"));
    }
}
