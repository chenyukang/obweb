extern crate base;
use base::*;
use chrono::prelude::*;
use chrono::DateTime;
use clap::App;
use colored::Colorize;
use daemonize::Daemonize;
use nix::sys::signal::kill;
use nix::sys::signal::Signal;
use nix::unistd::Pid;
use serde::Deserialize;
use std::error::Error;
use std::fs;
use std::fs::File;
use std::net::Ipv4Addr;
use std::path::PathBuf;
use std::process::ExitCode;
use warp::Filter;

#[derive(Deserialize, Debug)]
pub struct Request {
    pub date: String,
    pub links: String,
    pub text: String,
    pub image: String,
    pub page: String,
}

#[derive(Debug, Deserialize)]
struct RssQuery {
    query_type: String,
}

#[derive(Debug, Deserialize)]
struct PageQuery {
    path: String,
}

#[derive(Debug, Deserialize)]
struct Mark {}

fn ensure_path(path: &String) -> Result<String, &'static str> {
    let cleaned_path = path_clean::clean(path);
    if !((cleaned_path.starts_with("ob/") && cleaned_path.ends_with(".md"))
        || (cleaned_path.starts_with("pages/")))
    {
        return Err("Invalid path");
    }
    Ok(cleaned_path)
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
    let (title, source) = if let Some(p) = page {
        time = p.publish_datetime.clone();
        if !p.readed {
            let _ = rss::update_page_read(&p.link);
            println!("set {} readed ...", p.link);
        }
        (p.title.clone(), p.source.clone())
    } else {
        ("".to_string(), "".to_string())
    };
    return Ok(warp::reply::json(&(
        title,
        data,
        query.path.clone(),
        time,
        source,
    )));
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
        30
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
    let routes = warp::path!("read").and(warp::fs::file("./front/public/index.html"));
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

    // start a new thread to update rss priodically
    tokio::spawn(async move {
        loop {
            let res = tokio::task::spawn_blocking(|| rss::update_rss(None, false).unwrap()).await;
            match res {
                Ok(_) => eprintln!("RSS updated successfully"),
                Err(e) => eprintln!("Background task panicked: {:?}", e),
            }
            tokio::time::sleep(std::time::Duration::from_secs(60 * 20)).await;
        }
    });
    warp::serve(routes).run((Ipv4Addr::UNSPECIFIED, port)).await
}

pub fn check_process(pid_file: &PathBuf) -> Result<i32, ExitCode> {
    let pid_str = fs::read_to_string(pid_file).map_err(|_| ExitCode::FAILURE)?;
    let pid = pid_str
        .trim()
        .parse::<i32>()
        .map_err(|_| ExitCode::FAILURE)?;

    // Check if the process is running
    match kill(Pid::from_raw(pid), None) {
        Ok(_) => Ok(pid),
        Err(_) => Err(ExitCode::FAILURE),
    }
}

fn kill_process(pid_file: &PathBuf, name: &str) -> Result<(), ExitCode> {
    if check_process(pid_file).is_err() {
        eprintln!("{} is not running", name);
        return Ok(());
    }
    let pid_str = fs::read_to_string(pid_file).map_err(|_| ExitCode::FAILURE)?;
    let pid = pid_str
        .trim()
        .parse::<i32>()
        .map_err(|_| ExitCode::FAILURE)?;
    eprintln!("kill {} process {} ...", name, pid.to_string().red());
    // Send a SIGTERM signal to the process
    let _ = kill(Pid::from_raw(pid), Some(Signal::SIGTERM)).map_err(|_| ExitCode::FAILURE);
    // sleep 3 seconds and check if the process is still running
    std::thread::sleep(std::time::Duration::from_secs(3));
    match check_process(pid_file) {
        Ok(_) => kill(Pid::from_raw(pid), Some(Signal::SIGKILL)).map_err(|_| ExitCode::FAILURE),
        _ => Ok(()),
    }
}

fn main() {
    let matches = App::new("Obweb")
        .version("0.1")
        .author("yukang <moorekang@gmail.com>")
        .about("Rss-Rss Reader in Rust")
        .arg(clap::Arg::new("port").short('p').help("Listen port"))
        .arg(clap::Arg::new("daemon").short('d').help("Run as daemon"))
        .arg(clap::Arg::new("stop").short('s').help("Stop daemon"))
        .get_matches();

    let port = match matches.value_of("port") {
        Some(port) => port.parse::<u16>().unwrap(),
        None => 8005,
    };

    let pid_file: PathBuf = format!("/tmp/rss-rs-{}.pid", port).into();

    if matches.is_present("daemon") {
        if check_process(&pid_file).is_ok() {
            eprintln!("{}", "rss-rs is already running".red());
            return;
        }

        let pwd = std::env::current_dir().unwrap();
        let log_file = File::create("/tmp/rss-rs.log").unwrap();
        let daemonize = Daemonize::new()
            .pid_file(format!("/tmp/rss-rs-{}.pid", port))
            .stdout(log_file)
            .working_directory(pwd)
            .privileged_action(|| "Executed before drop privileges");
        match daemonize.start() {
            Ok(_) => {
                println!("Success, daemonized");
                run_server(port);
            }
            Err(e) => eprintln!("Error, {}", e),
        }
    } else if matches.is_present("stop") {
        kill_process(&pid_file, "rss-rs").unwrap();
    } else {
        run_server(port);
    }
}
