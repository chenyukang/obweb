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
static PAGES_DB: &'static str = "/tmp/pages.db";

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

fn fetch_feed(feed: &str, force: bool) -> Result<i32, Box<dyn Error>> {
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
        let prev = query_page_link(&link);
        let page_exist = prev.is_some();
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

fn init_db(db_name: Option<&str>) -> rusqlite::Result<()> {
    let name = db_name.unwrap_or(PAGES_DB);
    if !Path::new(name).exists() {
        let conn = Connection::open(name)?;
        conn.execute_batch(
            r#"
            BEGIN;
            CREATE TABLE pages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title String NOT NULL,
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
    let rss_buf = fs::read_to_string(ALL_FEEDS)?;
    let feeds = rss_buf
        .split("\n")
        .map(|l| l.trim())
        .filter(|&l| l.len() > 0)
        .collect::<Vec<_>>();
    if let Some(f) = feed {
        let _ = fetch_feed(f, true)?;
    } else {
        for feed in feeds.iter() {
            println!("force: {:?}", force);
            let _ = fetch_feed(*feed, force);
        }
    }

    cleanup_pages(&feeds)?;
    Ok(())
}

fn cleanup_pages(feeds: &Vec<&str>) -> rusqlite::Result<()> {
    let conn = Connection::open(PAGES_DB)?;
    let params = feeds
        .iter()
        .map(|f| format!("'{}'", f))
        .collect::<Vec<String>>();
    let sql = format!(
        "DELETE FROM pages WHERE source NOT IN ({})",
        params.join(", ")
    );
    conn.execute(&sql, [])?;
    Ok(())
}

fn dump_new_page(page: &Page) -> rusqlite::Result<()> {
    let conn = Connection::open(PAGES_DB)?;
    conn.execute(
        "INSERT INTO pages (title, link, website, publish_datetime, readed, source) values (?1, ?2, ?3, ?4, ?5, ?6)",
        params![page.title, page.link, page.website, page.publish_datetime, page.readed, page.source])?;
    Ok(())
}

pub fn remove_pages_from(feed: &str) -> rusqlite::Result<usize> {
    let conn = Connection::open(PAGES_DB)?;
    conn.execute("DELETE FROM pages where source = ?", [feed])
}

pub fn update_page_read(link: &str) -> rusqlite::Result<usize> {
    let conn = Connection::open(PAGES_DB)?;
    conn.execute("UPDATE pages set readed = 1 where link = ?", [link])
}

pub fn query_pages(limits: &Vec<(&str, &str)>) -> Vec<Page> {
    let conn = Connection::open(PAGES_DB).unwrap();
    let limit_str = if limits.len() > 0 {
        limits
            .iter()
            .map(|&(k, v)| format!("{} = '{}'", k, v))
            .collect::<Vec<String>>()
            .join(" AND ")
    } else {
        String::from(" 1 = 1 ")
    };
    let sql = format!("SELECT * FROM pages WHERE {} ORDER BY id DESC", limit_str);
    println!("sql: {:?}", sql);
    let mut statement = conn.prepare(&sql).unwrap();
    let pages = statement
        .query_map([], |row| {
            Ok(Page {
                title: row.get(1).unwrap(),
                link: row.get(2).unwrap(),
                website: row.get(3).unwrap(),
                publish_datetime: row.get(4).unwrap(),
                readed: row.get(5).unwrap(),
                source: row.get(6).unwrap(),
            })
        })
        .unwrap();

    let res: Vec<Page> = pages.map(|f| f.unwrap()).collect();
    return res;
}

pub fn query_page_link(link: &str) -> Option<Page> {
    let pages = query_pages(&vec![("link", link)]);
    assert!(pages.len() <= 1);
    if pages.len() == 1 {
        return Some(pages[0].clone());
    } else {
        None
    }
}

pub fn query_page(title: &str) -> Option<Page> {
    let pages = query_pages(&vec![("title", title)]);
    //assert!(pages.len() <= 1);
    if pages.len() == 1 {
        return Some(pages[0].clone());
    } else {
        None
    }
}

pub fn migrate_from_json_to_sqli() -> Result<(), Box<dyn Error>> {
    init_db(None)?;
    let page_buf = fs::read_to_string("./db/pages.json").unwrap_or(String::from("[]"));
    let mut pages: Vec<Page> = serde_json::from_str(&page_buf).unwrap();
    pages.sort_by(|a, b| {
        a.publish_datetime
            .parse::<DateTime<Local>>()
            .unwrap()
            .partial_cmp(&b.publish_datetime.parse::<DateTime<Local>>().unwrap())
            .unwrap()
    });

    for page in pages.iter() {
        println!("dump: {:?}", &page.link);
        dump_new_page(page)?;
    }
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
        init_db(None)?;
        assert!(Path::new(PAGES_DB).exists());

        let conn = Connection::open(&PAGES_DB)?;
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

        let pages = query_pages(&vec![]);
        assert_eq!(pages.len(), 2);

        let page_res = query_page("title_new");
        assert_eq!(page_res.unwrap().link, "link_new");

        let mut new_page = page.clone();
        new_page.source = "source3".to_string();
        new_page.link = "link_3".to_string();
        dump_new_page(&new_page)?;

        remove_pages_from("source")?;
        let pages = query_pages(&vec![]);
        assert_eq!(pages.len(), 1);
        Ok(())
    }

    #[test]
    fn test_cleanup_pages() -> rusqlite::Result<()> {
        let _ = fs::remove_file(PAGES_DB);
        init_db(None)?;
        assert!(Path::new(PAGES_DB).exists());

        let page1 = Page {
            title: "title1".to_string(),
            link: "link1".to_string(),
            website: "website".to_string(),
            publish_datetime: "publish_time".to_string(),
            readed: true,
            source: "source1".to_string(),
        };
        let mut page2 = page1.clone();
        let mut page3 = page1.clone();
        page2.title = "title2".to_string();
        page2.link = "link2".to_string();
        page2.source = "source2".to_string();
        page3.title = "title3".to_string();
        page3.link = "link3".to_string();
        page3.source = "source3".to_string();

        dump_new_page(&page1)?;
        dump_new_page(&page2)?;
        dump_new_page(&page3)?;
        cleanup_pages(&vec!["source1", "source2"])?;

        let pages = query_pages(&vec![]);
        assert_eq!(pages.len(), 2);

        let page = query_page("title");
        assert!(page.is_none());
        let page = query_page("title1");
        assert_eq!(page.unwrap().title, "title1");

        Ok(())
    }

    #[test]
    fn test_update_read() -> rusqlite::Result<()> {
        let _ = fs::remove_file(PAGES_DB);
        init_db(None)?;
        assert!(Path::new(PAGES_DB).exists());
        let page = Page {
            title: "title1".to_string(),
            link: "link1".to_string(),
            website: "website".to_string(),
            publish_datetime: "publish_time".to_string(),
            readed: false,
            source: "source1".to_string(),
        };
        dump_new_page(&page)?;

        let page = query_page_link("link1");
        assert_eq!(page.unwrap().readed, false);

        update_page_read("link1")?;
        let page = query_page_link("link1");
        assert_eq!(page.unwrap().readed, true);
        Ok(())
    }
}
