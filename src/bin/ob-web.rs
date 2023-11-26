extern crate base;
use base::*;
use base64::decode;
use chrono::prelude::*;
use chrono::DateTime;
use clap::App;
use glob::glob;
use path_clean;
use rand::seq::SliceRandom;
use serde::Deserialize;
use std::error::Error;
use std::fs;
use std::fs::File;
use std::net::Ipv4Addr;
use std::path::Path;
use warp::{reject, Filter, Rejection, Reply};
#[derive(Deserialize, Debug)]
pub struct Request {
    pub date: String,
    pub links: String,
    pub text: String,
    pub image: String,
    pub page: String,
}

#[derive(Debug, Deserialize)]
struct Update {
    file: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct SearchQuery {
    keyword: String,
}

#[derive(Debug, Deserialize)]
struct RssQuery {
    query_type: String,
}

#[derive(Debug, Deserialize)]
struct PageQuery {
    path: String,
    query_type: String,
}

#[derive(Debug, Deserialize)]
struct Mark {
    index: usize,
}

fn ensure_path(path: &String) -> Result<String, &'static str> {
    let cleaned_path = path_clean::clean(path);
    if !((cleaned_path.starts_with("ob/") && cleaned_path.ends_with(".md"))
        || (cleaned_path.starts_with("pages/")))
    {
        return Err("Invalid path");
    }
    Ok(cleaned_path)
}

fn gen_path(date: &String, page: &String) -> String {
    let path = if page.is_empty() {
        format!("./ob/Daily/{}.md", date)
    } else {
        format!("./ob/Unsort/{}.md", page)
    };
    let path = ensure_path(&path).unwrap();
    if !Path::new(&path).exists() {
        File::create(&path).unwrap();
    }
    return path;
}

fn decode_image(data: &String) -> Vec<u8> {
    let index = data.find(",").unwrap();
    let mut image = data.chars().skip(index + 1).collect::<String>();
    image = image.replace(" ", "+");
    decode(image).unwrap()
}

fn page_query(query: &PageQuery) -> Result<warp::reply::Json, &'static str> {
    let page = rss::query_page_link(&query.path);
    if page.is_none() {
        return Ok(warp::reply::json(&(String::from("NoPage"), String::new())));
    }
    let path = ensure_path(&format!(
        "./pages/{}.html",
        page.as_ref().unwrap().title.clone()
    ))?;
    let data = fs::read_to_string(&path).unwrap();
    let mut time = String::new();
    let title = if let Some(p) = page {
        time = p.publish_datetime.clone();
        if !p.readed {
            let _ = rss::update_page_read(&p.link);
            println!("set {} readed ...", p.link);
        }
        p.title.clone()
    } else {
        "".to_string()
    };
    return Ok(warp::reply::json(&(title, data, query.path.clone(), time)));
}

fn rss_query(query: &RssQuery) -> Result<String, Box<dyn Error>> {
    let limits = if query.query_type == "unread" {
        vec![("readed", "0")]
    } else {
        vec![]
    };
    let mut pages = rss::query_pages(&limits);
    pages.sort_by(|a, b| {
        b.publish_datetime
            .parse::<DateTime<Local>>()
            .unwrap()
            .partial_cmp(&a.publish_datetime.parse::<DateTime<Local>>().unwrap())
            .unwrap()
    });

    let page_limit = if query.query_type == "unread" {
        15
    } else {
        100
    };
    let max_len = usize::min(page_limit as usize, pages.len());
    let res: Vec<String> = pages[..max_len]
        .iter()
        .map(|page| {
            let class = if page.readed { "visited" } else { "" };
            format!(
                "<li><a class=\"{}\" id=\"{}\", href=\"#\">{}</a></li>",
                class, page.link, page.title
            )
        })
        .collect();
    Ok(res.join(""))
}

fn rss_mark(_query: &Mark) -> Result<(), Box<dyn Error>> {
    rss::mark_pages_read(15)?;
    Ok(())
}

#[tokio::main]
pub async fn run_server(port: u16) {
    pretty_env_logger::init();

    //let pages = warp::path("static").and(warp::fs::dir("./static/"));
    let routes = warp::path!("obweb").and(warp::fs::file("./front/public/index.html"));
    let front = warp::path("front").and(warp::fs::dir("./front/public/"));
    let routes = routes.or(front);

    let images = warp::path("static")
        .and(warp::path("images"))
        .and(warp::get())
        .and(warp::fs::dir("./ob/Pics"));

    let page_images = warp::path("pages")
        .and(warp::path("images"))
        .and(warp::fs::dir("./pages/images"));
    let routes = routes.or(images).or(page_images);

    let page = warp::path!("api" / "page")
        .and(warp::get())
        .and(warp::query::<PageQuery>())
        .map(|query: PageQuery| {
            let res = page_query(&query);
            res.unwrap()
        });
    let routes = routes.or(page);

    let rss = warp::path!("api" / "rss")
        .and(warp::get())
        .and(warp::query::<RssQuery>())
        .map(|query: RssQuery| {
            let res = rss_query(&query);
            if res.is_ok() {
                format!("{}", res.unwrap())
            } else {
                format!("no-page")
            }
        });

    let rss_mark = warp::path!("api" / "rss_mark")
        .and(warp::post())
        .and(warp::query::<Mark>())
        .map(|query: Mark| {
            let res = rss_mark(&query);
            if res.is_ok() {
                format!("ok")
            } else {
                format!("no-page")
            }
        });
    let routes = routes.or(rss).or(rss_mark);

    let log = warp::log("obweb::api");
    let routes = routes.with(log);
    println!("listen to : {} ...", port);

    warp::serve(routes).run((Ipv4Addr::UNSPECIFIED, port)).await
}

fn main() {
    let matches = App::new("Obweb")
        .version("0.1")
        .author("yukang <moorekang@gmail.com>")
        .about("Rss-Rss Reader in Rust")
        .arg("-p, --port=[PORT]       'Listen port'")
        .get_matches();

    let port = match matches.value_of("port") {
        Some(port) => port.parse::<u16>().unwrap(),
        None => 8005,
    };

    run_server(port);
}
