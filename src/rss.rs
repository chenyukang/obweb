use chrono::prelude::*;
use feed_rs::model::Link;
use feed_rs::parser;
use rusqlite::{params, Connection};
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use sha2::Digest;
use std::error::Error;
use std::fs;
use std::path::Path;
use url::Url;

#[cfg(test)]
static PAGES_DB: &'static str = "./db/test_pages.db";

#[cfg(not(test))]
static PAGES_DB: &'static str = "./db/pages.db";

static IMAGE_DIR: &'static str = "./pages/images";
static ALL_FEEDS: &'static str = "./ob/Unsort/feeds.md";
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

fn remove_elements(content: &str, keywords: &Vec<&str>) -> String {
    let html = Html::parse_document(content);
    let mut result = html.root_element().html().to_string();
    for keyword in keywords {
        let select = Selector::parse(keyword).unwrap();
        html.select(&select).for_each(|it| {
            let unescaped = it.html();
            assert!(result.contains(&unescaped));
            result = result.replace(&unescaped, "")
        });
    }
    return result;
}

fn gen_image_name(uri: &str) -> Result<String, Box<dyn Error>> {
    let digest = sha2::Sha256::digest(uri.as_bytes());
    let hex = digest
        .iter()
        .map(|v| format!("{:02x}", v))
        .collect::<Vec<String>>()
        .join("");
    let len = usize::min(10, hex.len());
    let hex_str = &hex[0..len].to_string();
    let image_name = Url::parse(uri)?
        .path_segments()
        .map(|c| c.collect::<Vec<_>>())
        .unwrap_or_default()
        .last()
        .unwrap()
        .to_string();
    let segs = image_name.split(".").into_iter().collect::<Vec<_>>();
    let extension = if segs.len() >= 2 {
        segs.last().unwrap()
    } else {
        "png"
    };
    fs::create_dir_all(IMAGE_DIR)?;
    Ok(format!("{}/{}.{}", IMAGE_DIR, hex_str, extension))
}

fn convert_image(uri: &str) -> Result<String, Box<dyn Error>> {
    println!("preprocess_image: {:?}", uri);
    let image_path = gen_image_name(uri).unwrap();
    let relative_path = image_path.replace("./", "/");
    if !Path::new(&image_path).exists() {
        let resp = reqwest::blocking::get(uri)?;
        let image = resp.bytes()?;
        fs::write(&image_path, &image)?;
        println!("image saved: {:?}", image_path);
    }
    Ok(relative_path.clone())
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
            let uri = Url::parse(url);
            let mut full_uri = url.to_string();
            if !(uri.is_ok() && uri.unwrap().scheme().to_string().starts_with("http")) {
                full_uri = format!("{}/{}", website, url);
            }
            if let Ok(image) = convert_image(&full_uri) {
                result = result.replace(url, &image);
            }
        }
    }
    result.clone()
}

fn fetch_page(url: &str) -> Result<String, Box<dyn Error>> {
    println!("fetch_page: {:?}", url);
    let resp = reqwest::blocking::get(url)?;
    let res = resp.text()?;
    let document = Html::parse_document(&res);
    let article = extract(&document, "article");
    if let Some(cont) = article {
        Ok(cont)
    } else {
        Ok(extract(&document, "body").unwrap_or(res.clone()))
    }
}

fn first_link(links: &Vec<Link>) -> String {
    if let Some(l) = links.first() {
        if Url::parse(&l.href).is_ok() {
            return l.href.to_owned();
        }
    }
    String::from("")
}

fn fetch_feed(feed: &str, pages: &Vec<Page>, force: bool) -> Result<i32, Box<dyn Error>> {
    println!("fetch_feed: {:?}", feed);
    let resp = reqwest::blocking::get(feed);
    let body = resp?.text();
    let feed_resp = parser::parse(body?.as_bytes())?;
    println!("title: {:?}", feed_resp.title);
    let website = first_link(&feed_resp.links);
    let mut succ_count = 0;
    for entry in feed_resp.entries {
        let entry_title = entry.title.unwrap().content.replace("/", "|");
        let published_time = entry
            .published
            .unwrap_or(entry.updated.unwrap_or(Utc::now()));

        let link = first_link(&entry.links);
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
            let descrption = if let Some(desc) = entry.summary {
                desc.content
            } else {
                String::from("")
            };
            let page = {
                let page = fetch_page(&link)?;
                let keywords = vec!["footer", "header", "script", "style", "comments"];
                remove_elements(&page, &keywords)
            };

            // We need to guess whether the descrption is only a summary
            // If page contains multimedia, return the page
            if (page.len() > descrption.len() * 2)
                || (page.contains(&descrption))
                || (page.contains("<audio") || page.contains("<video"))
                || page.contains("<code>")
            {
                page
            } else {
                descrption
            }
        };

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
            let path = format!("./pages/{}.html", entry_title);
            fs::write(&path, &content)?;
            dump_new_page(&page)?;
            succ_count += 1;
        } else {
            println!("error: {}", entry_title);
        }
    }
    Ok(succ_count)
}

pub fn cur_pages() -> Vec<Page> {
    let page_buf = fs::read_to_string(PAGES_DB).unwrap_or(String::from("[]"));
    serde_json::from_str(&page_buf).unwrap()
}

fn init_db(db_name: Option<&str>) -> Result<(), Box<dyn Error>> {
    let name = db_name.unwrap_or(PAGES_DB);
    if !Path::new(name).exists() {
        let conn = Connection::open(PAGES_DB)?;
        conn.execute_batch(
            r#"
            BEGIN;
            CREATE TABLE pages (title String NOT NULL,
                                link String NOT NULL,
                                website String,
                                publish_datetime String,
                                readed Boolean,
                                source String NOT NULL);
            CREATE UNIQUE INDEX idx_pages_link ON pages (link);
            COMMIT;
            "#,
        )?;
    }
    Ok(())
}

pub fn update_rss(feed: Option<&str>, force: bool) -> Result<(), Box<dyn Error>> {
    init_db(None)?;
    let pages = cur_pages();
    let rss_buf = fs::read_to_string(ALL_FEEDS)?;
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
    dump_pages(&filtered_pages)?;
    Ok(())
}

pub fn dump_pages(pages: &Vec<Page>) -> Result<(), Box<dyn Error>> {
    let dump_json = serde_json::to_string(&pages);
    if dump_json.is_ok() {
        fs::write(PAGES_DB, &dump_json.unwrap())?
    }
    Ok(())
}

fn dump_new_page(page: &Page) -> rusqlite::Result<()> {
    let conn = Connection::open(PAGES_DB)?;

    conn.execute(
        "INSERT INTO pages (title, link, website, publish_datetime, readed, source) values (?1, ?2, ?3, ?4, ?5, ?6)",
        params![page.title, page.link, page.website, page.publish_datetime, page.readed, page.source])?;
    Ok(())
}

pub fn clear_for_feed(feed: &str) -> Result<(), Box<dyn Error>> {
    let page_buf = fs::read_to_string(PAGES_DB).unwrap_or(String::from("[]"));
    let pages: Vec<Page> = serde_json::from_str(&page_buf).unwrap();
    let filted_pages = pages
        .iter()
        .filter(|p| p.source != feed)
        .map(|p| p.clone())
        .collect::<Vec<_>>();
    dump_pages(&filted_pages)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_url_base() -> Result<(), Box<dyn Error>> {
        assert!(gen_image_name("http://abc/d/x/demo.png")?.ends_with(".png"));
        assert!(gen_image_name("http://abc/d/x/demo.png?ab=1&c=3")?.ends_with(".png"));
        assert!(gen_image_name("https://a/demo.png?ab=1&c=3")?.ends_with(".png"));
        assert!(gen_image_name("http://x.com/demo.jpg")?.ends_with(".jpg"));
        assert!(gen_image_name("http://abc.com/demo.jpg?/test/")?.ends_with("jpg"));
        assert!(gen_image_name("http://abc.com/demo?/test/")?.ends_with("png"));
        Ok(())
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
        <comments>Comments</comments>
        <h1 class="foo">Hello, <i>world!</i></h1>
        </body>
    "#;
        let res = remove_elements(html, &vec!["footer", "comments"]);
        assert!(!res.contains("<footer>"));
        assert!(!res.contains("<comments>"));
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
        assert!(processed.find(".png").is_some());
    }

    #[test]
    fn test_fetch_page() {
        let url = "https://blog.janestreet.com/ocaml-4-03-everything-else/";
        let content = fetch_page(url).unwrap();
        assert!(!content.contains("<body>"));
    }

    #[test]
    fn test_fetch_page_remove_footer() -> Result<(), Box<dyn Error>> {
        let url = "https://yihui.org/cn/2021/07/injuries/";
        let mut content = fetch_page(url)?;
        assert!(content.contains("<footer>"));
        content = remove_elements(&content, &vec!["footer"]);
        assert!(!content.contains("<footer>"));
        Ok(())
    }

    #[test]
    fn test_fetch_page_images() -> Result<(), Box<dyn Error>> {
        let uri = "https://yihui.org/cn/2020/07/wild-onion/";
        let mut content = fetch_page(uri)?;
        content = preprocess_image(&content, uri);
        fs::write("/tmp/tmp.html", &content)?;
        assert!(content.contains("/images/"));
        Ok(())
    }

    #[test]
    fn test_db() -> rusqlite::Result<()> {
        let _ = fs::remove_file(PAGES_DB);
        let res = init_db(None);
        assert!(Path::new(PAGES_DB).exists());
        assert!(res.is_ok());

        let conn = Connection::open(PAGES_DB)?;
        conn.execute_batch(
            r#"
        INSERT INTO pages (title, link, website, publish_datetime, readed, source)
        VALUES ('title',
                'link',
                'website',
                'publish_time',
                true,
                'source');
        "#,
        )?;

        let mut statement = conn.prepare("SELECT count(*) FROM pages")?;
        let count: rusqlite::Result<i64> = statement.query_row([], |r| r.get(0));
        assert_eq!(1i64, count?);

        let page = Page {
            title: "title_new".to_string(),
            link: "link_new".to_string(),
            website: "website".to_string(),
            publish_datetime: "publish_time".to_string(),
            readed: true,
            source: "source".to_string(),
        };
        dump_new_page(&page)?;

        let mut statement = conn.prepare("SELECT count(*) FROM pages")?;
        let count: rusqlite::Result<i64> = statement.query_row([], |r| r.get(0));
        assert_eq!(2i64, count?);

        let mut stmt = conn.prepare("SELECT link FROM pages WHERE title = ? ")?;
        let mut res = stmt.query(["title_new"])?;
        let mut names: Vec<String> = Vec::new();
        while let Some(row) = res.next()? {
            names.push(row.get(0)?);
        }
        assert_eq!(names.len(), 1);
        assert_eq!(names[0], "link_new");
        fs::remove_file(PAGES_DB).unwrap();
        Ok(())
    }
}
