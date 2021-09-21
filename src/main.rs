use std::env;
use std::net::Ipv4Addr;
use std::process::{Command};
use warp::Filter;
use chrono::{DateTime};
use serde::Deserialize;
use std::path::Path;
use std::fs;
use std::fs::File;
use base64::decode;
use chrono::prelude::*;

#[derive(Deserialize, Debug)]
pub struct Request {
    pub date: String,
    pub tags: String,
    pub links: String,
    pub text: String,
    pub image: String,
}

fn git_pull() {
    let child = Command::new("git")
    .current_dir("./ob")
    .args(&["pull", "--rebase"])
    .spawn()
    .expect("failed to execute child");
    let output = child.wait_with_output().expect("failed to wait on child");
    println!("{:?}", output);
}

pub fn git_sync() {
    let child = Command::new("git")
        .current_dir("./ob")
        .args(&["add", "."])
        .spawn()
        .expect("failed to execute child");
    let output = child.wait_with_output().expect("failed to wait on child");
    println!("{:?}", output);

    let child = Command::new("git")
    .current_dir("./ob")
    .args(&["commit", "-am'ob-web'"])
    .spawn()
    .expect("failed to execute child");
    let output = child.wait_with_output().expect("failed to wait on child");
    println!("{:?}", output);

    let child = Command::new("git")
    .current_dir("./ob")
    .args(&["push"])
    .spawn()
    .expect("failed to execute child");
    let output = child.wait_with_output().expect("failed to wait on child");
    println!("{:?}", output);
}

fn process_request(req: &Request) -> Result<(), &'static str> {
    git_pull();
    let date_str = req.date.to_string();
    let parsed_date = DateTime::parse_from_rfc3339(&date_str).unwrap();
    let parsed_date = parsed_date.with_timezone(&FixedOffset::east(8*3600));
    let date = parsed_date.format("%Y-%m-%d").to_string();
    let time = parsed_date.format("%H:%M:%S").to_string();
    println!("date time: {:?}", date);
    let path = format!("./ob/Daily/{}.md", date);
    if !Path::new(&path).exists() {
        File::create(&path).unwrap();
    }
    let mut data = fs::read_to_string(&path).expect("Unable to read file");
    if data.len() == 0 {
        data = format!("##{}", date);
    }
    let text = req.text.to_string();
    let mut write_content = data + "\n\n---";
    write_content += format!("\nTime: {}", time).as_str();
    if req.links.len() > 0 {
        let links = req.links.to_string();
        let links_vec: Vec<&str> = links.split(",").collect();
        let mut links_text = String::new();
        for link in links_vec {
            if links_text.len() > 0 {
                links_text += " ";
            }
            links_text += format!("[[{}]]", link).as_str();
        }
        write_content = format!("{}\nLinks: {}", write_content, links_text);
    }

    if req.tags.len() > 0 {
        let tags = req.tags.to_string();
        let tags_vec: Vec<&str> = tags.split(",").collect();
        let mut tags_text = String::new();
        for link in tags_vec {
            if tags_text.len() > 0 {
                tags_text += " ";
            }
            tags_text += format!("#{}", link).as_str();
        }
        write_content = format!("{}\nTags: {}", write_content, tags_text);
    }
    write_content += format!("\n\n{}", text).as_str();
    if req.image.len() > 0 {
        let image = req.image.to_string()
            .replace("data:image/jpeg;base64,", "")
            .replace(" ", "+");
        let image_buf = decode(image).unwrap();
        let image_name = format!("ob-web-{}-{}.png", date, time).replace(":", "-");
        let image_path = format!("./ob/Pics/{}", image_name);
        let image_path = Path::new(&image_path);
        fs::write(image_path, &image_buf).unwrap();
        //println!("image buf:\n {:?}", image_buf);
        write_content = format!("{}\n![[{} | #x-small]]\n", write_content, image_name);
    }

    fs::write(&path, write_content).expect("Unable to write file");
    git_sync();
    Ok(())
}

#[tokio::main]
pub async fn run_server(port: u16) {
    pretty_env_logger::init();
    let routes = warp::path!("api" / "entry")
        .and(warp::post())
        .and(warp::body::json())
        .map(|request: Request| {
            println!("request: {:?}", request);
            let res = process_request(&request);
            if res.is_err() {
                format!("failed")
            } else {
                format!("ok")
            }
        });

    let pages = warp::path("static").and(warp::fs::dir("./static/"));
    let routes = routes.or(pages);
    let routes = routes.with(warp::cors().allow_any_origin());
    let log = warp::log("ob-web.log");
    let routes = routes.with(log);
    println!("listen to : {} ...", port);

    warp::serve(routes).run((Ipv4Addr::UNSPECIFIED, port)).await
}

fn main() {
    let port_key = "FUNCTIONS_CUSTOMHANDLER_PORT";
    let _port: u16 = match env::var(port_key) {
        Ok(val) => val.parse().expect("Custom Handler port is not a number!"),
        Err(_) => 8005,
    };

    run_server(_port);
}
