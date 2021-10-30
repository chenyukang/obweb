use base64::decode;
use chrono::prelude::*;
use chrono::DateTime;
use clap::App;
use glob::glob;
use path_clean;
use rand::seq::SliceRandom;
use serde::Deserialize;
use std::fs;
use std::fs::File;
use std::net::Ipv4Addr;
use std::path::Path;
use warp::{reject, Filter, Rejection, Reply};

mod auth;
mod git;
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
struct PageQuery {
    path: String,
    rand: bool,
}

#[derive(Debug, Deserialize)]
struct Mark {
    index: usize,
}

fn ensure_path(path: &String) -> Result<String, &'static str> {
    let cleaned_path = path_clean::clean(path);
    if !(cleaned_path.starts_with("ob/") && cleaned_path.ends_with(".md")) {
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

fn process_image(data: &String) -> Vec<u8> {
    let index = data.find(",").unwrap();
    let mut image = data.chars().skip(index + 1).collect::<String>();
    image = image.replace(" ", "+");
    decode(image).unwrap()
}

fn page_post(req: &Request) -> Result<(), &'static str> {
    if !fs::read_to_string("./db/debug").is_err() {
        println!("request: {:?}", req);
        return Ok(());
    }
    if !fs::read_to_string("./db/dev").is_err() {
        git::git_pull();
    }
    let date_str = req.date.to_string();
    let page_str = req.page.to_string();
    let parsed_date = DateTime::parse_from_rfc3339(&date_str)
        .unwrap()
        .with_timezone(&FixedOffset::east(8 * 3600));
    let date = parsed_date.format("%Y-%m-%d").to_string();
    let time = parsed_date.format("%H:%M").to_string();
    let path = gen_path(&date, &page_str);

    let mut data = fs::read_to_string(&path).expect("Unable to read file");
    if data.len() == 0 && page_str.is_empty() {
        // Add date as a header for daily page
        data = format!("## {}", date);
    }

    let mut content = String::new();
    let text = req.text.to_string();

    // generate content according to input
    {
        if !page_str.is_empty() {
            content += format!("\n### {} {}", date, time).as_str();
        } else {
            content += format!("\n### {}", time).as_str();
        }
        // Currently I treat links as tags.
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
            content = format!("{}\nLinks: {}\n", content, links_text);
        }
        let append = if page_str == "todo" {
            format!("- [ ] {}", text)
        } else {
            text
        };
        content += format!("\n{}", append).as_str();
        if req.image.len() > 0 {
            let image_buf = process_image(&req.image.to_string());
            let time_stamp = Local::now().format("%Y-%m-%d-%H-%M-%S").to_string();
            let image_name = format!("obweb-{}.png", time_stamp);
            let image_path = format!("./ob/Pics/{}", image_name);
            fs::write(&image_path, &image_buf).unwrap();
            content = format!("{}\n\n![[{} | #x-small]]\n", content, image_name);
        }
    }

    // If it's a todo, we add new content from head to tail
    if page_str == "todo" {
        content = format!("{}\n\n---\n", content);
        content = format!("{}\n{}", content, data);
    } else {
        content = data + "\n" + content.as_str();
    }

    fs::write(&path, content).expect("Unable to write file");
    std::thread::spawn(|| git::git_sync());
    Ok(())
}

fn page_query(query: &PageQuery) -> Result<(String, String), &'static str> {
    std::thread::spawn(|| git::git_pull());
    if query.rand {
        let mut files = vec![];
        for entry in glob("./ob/**/*.md").expect("failed") {
            match entry {
                Ok(path) => {
                    files.push(format!("{}", path.display()));
                }
                Err(e) => println!("{:?}", e),
            }
        }
        loop {
            let path = files.choose(&mut rand::thread_rng()).unwrap();
            //println!("path : {:?}", path);
            let content = fs::read_to_string(&path).unwrap_or(String::new());
            if content.len() > 4 && !path.contains(".excalidraw.") {
                // too short content tend to be meannless in random reading
                return Ok((path.to_string().replace("ob/", ""), content));
            }
        }
    } else {
        let path = ensure_path(&format!("./ob/{}", query.path))?;
        if !Path::new(&path).exists() {
            return Ok((String::from("NoPage"), String::new()));
        }
        let data = fs::read_to_string(&path).unwrap();
        return Ok((query.path.clone(), data));
    }
}

fn page_update(update: &Update) -> Result<(), &'static str> {
    let path = ensure_path(&format!("./ob/{}", update.file.to_string()))?;
    fs::write(path, update.content.to_string()).expect("Unable to write file");
    std::thread::spawn(|| git::git_sync());
    Ok(())
}

fn search_query(req: &SearchQuery) -> Result<String, &'static str> {
    std::thread::spawn(|| git::git_pull());

    let mut res = String::new();
    let mut files = vec![];
    let search_key = req.keyword.to_ascii_lowercase();

    for entry in glob("./ob/**/*.md").expect("failed") {
        match entry {
            Ok(path) => {
                //println!("{:?}", path.display());
                let path_str = format!("{}", &path.display()).to_ascii_lowercase();
                if path_str.contains(".excalidraw.") {
                    continue;
                }
                let content = fs::read_to_string(path.clone())
                    .unwrap_or(String::from(""))
                    .to_ascii_lowercase();
                if path_str.contains(&search_key) || content.contains(&search_key) {
                    files.push((format!("{}", path.display()), fs::metadata(path).unwrap()));
                }
            }
            Err(e) => println!("{:?}", e),
        }
    }

    files.sort_by(|(_, a), (_, b)| {
        b.modified()
            .unwrap()
            .partial_cmp(&a.modified().unwrap())
            .unwrap()
    });

    let max_len = if search_key.len() == 0 {
        10
    } else {
        files.len()
    };

    for (f, _) in files[..max_len].iter() {
        let link = format!("\n- [{}](#)", f);
        let link = link.replace("ob/", "");
        if !res.contains(&link) {
            res += &link;
        }
    }
    Ok(res)
}

fn mark_done(req: &Mark) -> Result<String, &'static str> {
    std::thread::spawn(|| git::git_pull());
    let todo = fs::read_to_string("./ob/Unsort/todo.md").unwrap();
    let todos: Vec<&str> = todo.split("---").collect();
    let mut elems: Vec<String> = todos.iter().map(|&x| String::from(x)).collect();
    elems[req.index] = elems[req.index].replace("- [ ] ", "- [x] ");
    let conent = elems.join("---");
    fs::write("./ob/Unsort/todo.md", conent).expect("Unable to write file");
    std::thread::spawn(|| git::git_sync());
    Ok(String::from("done"))
}

#[derive(Debug)]
struct Unauthorized;

impl reject::Reject for Unauthorized {}

fn auth_validation() -> impl Filter<Extract = ((),), Error = Rejection> + Copy {
    warp::header::<String>("Cookie").and_then(|n: String| async move {
        //println!("cookie: {:?}", n);
        let vals: Vec<&str> = n.split(";").collect();
        for val in vals {
            let v = val.trim().to_owned();
            if v.starts_with("token=") {
                let token = v.replace("token=", "");
                let res = auth::verify_token(&token);
                if res.is_none() {
                    return Err(warp::reject::not_found());
                } else if res.unwrap() {
                    return Ok(());
                }
            }
        }
        Err(reject::custom(Unauthorized))
    })
}

#[tokio::main]
pub async fn run_server(port: u16) {
    pretty_env_logger::init();
    let routes = warp::path!("api" / "entry")
        .and(warp::post())
        .and(auth_validation())
        .untuple_one()
        .and(warp::body::json())
        .map(|request: Request| {
            println!("request: {:?}", request.date);
            if page_post(&request).is_ok() {
                format!("ok")
            } else {
                format!("failed")
            }
        });

    let pages = warp::path("static").and(warp::fs::dir("./static/"));
    //let root = warp::path("obweb").map(|| warp::redirect(Uri::from_static("/static")));
    let root = warp::path!("obweb").and(warp::fs::file("./static/index.html"));
    let routes = routes.or(pages).or(root);

    let front = warp::path("front").and(warp::fs::dir("./front/public/"));
    let root = warp::path!("obwebx").and(warp::fs::file("./front/public/index.html"));
    let routes = routes.or(front).or(root);

    let images = warp::path("static")
        .and(warp::path("images"))
        .and(warp::get())
        .and(auth_validation())
        .untuple_one()
        .and(warp::fs::dir("./ob/Pics"));
    let routes = routes.or(images);

    let update = warp::path!("api" / "page")
        .and(warp::post())
        .and(auth_validation())
        .untuple_one()
        .and(warp::body::json())
        .map(|update: Update| {
            //println!("update: {:?}", update);
            page_update(&update).unwrap();
            warp::reply::with_status("ok", http::status::StatusCode::OK).into_response()
        });
    let routes = routes.or(update);

    let login = warp::path!("api" / "login")
        .and(warp::post())
        .and(warp::body::json())
        .map(|user: auth::User| {
            if auth::verify_user(&user) {
                let token = auth::gen_token();
                warp::reply::with_header(
                    token.clone(),
                    "set-cookie",
                    format!("token={}; Path=/; HttpOnly; Max-Age=1209600", token),
                )
                .into_response()
            } else {
                warp::reply::with_status("failed", http::StatusCode::UNAUTHORIZED).into_response()
            }
        });
    let routes = routes.or(login);

    let verify = warp::path!("api" / "verify")
        .and(warp::get())
        .and(auth_validation())
        .untuple_one()
        .map(|| warp::reply::reply().into_response());
    let routes = routes.or(verify);

    let page = warp::path!("api" / "page")
        .and(warp::get())
        .and(auth_validation())
        .untuple_one()
        .and(warp::query::<PageQuery>())
        .map(|query: PageQuery| {
            let res = page_query(&query);
            warp::reply::json(&res.unwrap())
        });
    let routes = routes.or(page);

    let search = warp::path!("api" / "search")
        .and(warp::get())
        .and(auth_validation())
        .untuple_one()
        .and(warp::query::<SearchQuery>())
        .map(|query: SearchQuery| {
            let res = search_query(&query);
            if res.is_ok() {
                format!("{}", res.unwrap())
            } else {
                format!("no-page")
            }
        });
    let routes = routes.or(search);

    let mark = warp::path!("api" / "mark")
        .and(warp::post())
        .and(auth_validation())
        .untuple_one()
        .and(warp::query::<Mark>())
        .map(|mark: Mark| {
            let res = mark_done(&mark);
            if res.is_ok() {
                format!("{}", res.unwrap())
            } else {
                format!("failed")
            }
        });
    let routes = routes.or(mark);

    let log = warp::log("obweb::api");
    let routes = routes.with(log);
    println!("listen to : {} ...", port);

    warp::serve(routes).run((Ipv4Addr::UNSPECIFIED, port)).await
}

fn main() {
    let matches = App::new("Obweb")
        .version("0.1")
        .author("yukang <moorekang@gmail.com>")
        .about("Obsidian Web")
        .arg("-c, --config            'Config username and password'")
        .arg("-p, --port=[PORT]       'Listen port'")
        .get_matches();

    let port = match matches.value_of("port") {
        Some(port) => port.parse::<u16>().unwrap(),
        None => 8005,
    };

    let config = matches.occurrences_of("config");
    if config > 0 as u64 {
        auth::init_password();
    }

    run_server(port);
}
