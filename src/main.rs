use argon2::{self, Config};
use base64::decode;
use chrono::prelude::*;
use chrono::DateTime;
use glob::{glob, glob_with, MatchOptions};
use rand::Rng;
use serde::Deserialize;
use std::env;
use std::fs;
use std::fs::File;
use std::net::Ipv4Addr;
use std::path::Path;
use std::process::Command;
use warp::{reject, Filter, Rejection, Reply};

#[derive(Deserialize, Debug)]
pub struct Request {
    pub date: String,
    pub tags: String,
    pub links: String,
    pub text: String,
    pub image: String,
    pub page: String,
}

#[derive(Debug, Deserialize)]
struct User {
    username: String,
    password: String,
}

#[derive(Debug, Deserialize)]
struct Update {
    file: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct DailyQuery {
    date: String,
}

#[derive(Debug, Deserialize)]
struct SearchQuery {
    keyword: String,
}

fn verify_user(user: &User) -> bool {
    let accounts = fs::read_to_string("./db/accounts.json").unwrap();
    let users: Vec<User> = serde_json::from_str(&accounts).unwrap();
    for u in users {
        if u.username == user.username && u.password == user.password {
            return true;
        }
    }
    false
}

fn verify_token(token: &str) -> bool {
    let data = fs::read_to_string("./db/tokens").unwrap();
    let tokens: Vec<&str> = data.split("\n").collect();
    for t in tokens {
        if t == token {
            return true;
        }
    }
    false
}

fn hash(password: &[u8]) -> String {
    let salt = rand::thread_rng().gen::<[u8; 32]>();
    let config = Config::default();
    //println!("{:?} {:?}", salt, config);
    let res = argon2::hash_encoded(password, &salt, &config).unwrap();
    base64::encode(&res)
}

fn gen_token(password: &str) -> String {
    let path = Path::new("./db/tokens");
    let mut prev_data = String::new();
    let token = hash(password.as_bytes());
    if !Path::new(&path).exists() {
        File::create(&path).unwrap();
    } else {
        let data = fs::read_to_string(path).unwrap();
        let mut tokens: Vec<&str> = data.split("\n").collect();
        let len = tokens.len();
        let max_len = 4;
        if len > max_len {
            tokens = tokens.into_iter().skip(len - max_len).collect();
        }
        prev_data = tokens.join("\n").clone();
        if !prev_data.is_empty() {
            prev_data.push('\n');
        }
    }
    //println!("write token: {:?}", token);
    fs::write(path, format!("{}{}", prev_data, token)).unwrap();
    token
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

fn git_sync() {
    git_pull();
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

fn gen_page(date: &String, page: &String) -> String {
    let path = if page.is_empty() {
        format!("./ob/Daily/{}.md", date)
    } else {
        format!("./ob/Unsort/{}.md", page)
    };
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

fn process_request(req: &Request) -> Result<(), &'static str> {
    if !fs::read_to_string("./db/debug").is_err() {
        println!("request: {:?}", req);
        return Ok(());
    }
    git_pull();
    let date_str = req.date.to_string();
    let page_str = req.page.to_string();
    let parsed_date = DateTime::parse_from_rfc3339(&date_str)
        .unwrap()
        .with_timezone(&FixedOffset::east(8 * 3600));
    let date = parsed_date.format("%Y-%m-%d").to_string();
    let time = parsed_date.format("%H:%M:%S").to_string();
    let path = gen_page(&date, &page_str);

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
            content = format!("{}\nLinks: {}", content, links_text);
        }
        let append = if page_str == "todo" {
            format!("- [ ] {}", text)
        } else {
            text
        };
        content += format!("\n\n{}", append).as_str();
        if req.image.len() > 0 {
            let image_buf = process_image(&req.image.to_string());
            let image_name = format!("ob-web-{}-{}.png", date, time).replace(":", "-");
            let image_path = format!("./ob/Pics/{}", image_name);
            let image_path = Path::new(&image_path);
            fs::write(image_path, &image_buf).unwrap();
            content = format!("{}\n\n![[{} | #x-small]]\n", content, image_name);
        }
    }

    // If it's a todo, we add new content from head to tail
    if page_str == "todo" {
        content = format!("{}\n\n---\n", content);
        content = format!("{}\n{}", content, data);
    } else {
        content = data + "\n" + content.as_str() + "\n";
    }

    fs::write(&path, content).expect("Unable to write file");
    git_sync();
    Ok(())
}

fn daily_query(req: &DailyQuery) -> Result<String, &'static str> {
    std::thread::spawn(|| git_pull());
    let path = format!("./ob/Daily/{}.md", req.date.to_string());
    println!("path : {:?}", path);
    let p = Path::new(&path);
    if Path::exists(&p) {
        return Ok(fs::read_to_string(&path).expect("Unable to read file"));
    } else {
        return Err("No such file");
    }
}

fn rand_query() -> Result<(String, String), &'static str> {
    use rand::seq::SliceRandom;
    std::thread::spawn(|| git_pull());

    let mut files = vec![];
    for entry in glob("./ob/**/*.md").expect("failed") {
        match entry {
            Ok(path) => {
                //println!("{:?}", path.display());
                files.push(format!("{}", path.display()));
            }
            Err(e) => println!("{:?}", e),
        }
    }
    let path = files.choose(&mut rand::thread_rng()).unwrap();
    println!("path : {:?}", path);
    let p = Path::new(&path);
    if Path::exists(&p) {
        return Ok((
            path.to_string().replace("ob/", ""),
            fs::read_to_string(&path).expect("Unable to read file"),
        ));
    } else {
        return Err("No such file");
    }
}

fn process_update(update: &Update) -> Result<(), &'static str> {
    std::thread::spawn(|| git_pull());
    let path = format!("./ob/{}", update.file.to_string());
    fs::write(path, update.content.to_string()).expect("Unable to write file");
    git_sync();
    Ok(())
}

fn search_query(req: &SearchQuery) -> Result<String, &'static str> {
    std::thread::spawn(|| git_pull());

    let mut res = String::new();
    let mut files = vec![];

    let pattern = format!("./ob/**/*{}*.md", req.keyword);
    let options = MatchOptions {
        case_sensitive: false,
        ..Default::default()
    };
    for entry in glob_with(&pattern, options).expect("failed") {
        match entry {
            Ok(path) => {
                //println!("{:?}", path.display());
                files.push((format!("{}", path.display()), fs::metadata(path).unwrap()));
            }
            Err(e) => println!("{:?}", e),
        }
    }
    for entry in glob("./ob/**/*.md").expect("failed") {
        match entry {
            Ok(path) => {
                //println!("{:?}", path.display());
                let content = fs::read_to_string(path.clone()).unwrap_or(String::from(""));
                if content
                    .to_ascii_lowercase()
                    .contains(&req.keyword.to_ascii_lowercase())
                {
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

    for (f, _) in files.iter() {
        let link = format!("\n- [{}](#)", &f);
        let link = link.replace("ob/", "");
        if !res.contains(&link) {
            res += &link;
        }
    }
    Ok(res)
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
                if verify_token(&token) {
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
            if process_request(&request).is_ok() {
                format!("ok")
            } else {
                format!("failed")
            }
        });

    let pages = warp::path("static").and(warp::fs::dir("./static/"));
    let root1 = warp::path::end()
        .and(warp::get())
        .and(warp::fs::file("./static/index.html"));
    let root2 = warp::path!("obweb")
        .and(warp::get())
        .and(warp::fs::file("./static/index.html"));
    let daily = warp::path!("daily")
        .and(warp::get())
        .and(warp::fs::file("./static/daily.html"));
    let search = warp::path!("search")
        .and(warp::get())
        .and(warp::fs::file("./static/search.html"));
    let routes = routes.or(pages).or(root1).or(root2).or(daily).or(search);

    let images = warp::path("static")
        .and(warp::path("images"))
        .and(warp::get())
        .and(auth_validation())
        .untuple_one()
        .and(warp::fs::dir("./ob/Pics"));
    let routes = routes.or(images);

    let page = warp::path("api")
        .and(warp::path("page"))
        .and(warp::get())
        .and(auth_validation())
        .untuple_one()
        .and(warp::fs::dir("./ob/"));
    let routes = routes.or(page);

    let update = warp::path!("api" / "page")
        .and(warp::post())
        .and(auth_validation())
        .untuple_one()
        .and(warp::body::json())
        .map(|update: Update| {
            println!("update: {:?}", update);
            process_update(&update).unwrap();
            warp::reply::with_status("ok", http::status::StatusCode::OK).into_response()
        });
    let routes = routes.or(update);

    let login = warp::path!("api" / "login")
        .and(warp::post())
        .and(warp::body::json())
        .map(|user: User| {
            if verify_user(&user) {
                let token = gen_token(&user.password);
                warp::reply::with_header(
                    token.clone(),
                    "set-cookie",
                    format!("token={}; Path=/; Max-Age=1209600", token),
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

    let daily = warp::path!("api" / "daily")
        .and(warp::get())
        .and(auth_validation())
        .untuple_one()
        .and(warp::query::<DailyQuery>())
        .map(|daily: DailyQuery| {
            let res = daily_query(&daily);
            if res.is_ok() {
                format!("{}", res.unwrap())
            } else {
                format!("no-page")
            }
        });
    let routes = routes.or(daily);

    let rand = warp::path!("api" / "rand")
        .and(warp::get())
        .and(auth_validation())
        .untuple_one()
        .map(|| {
            let res = rand_query();
            warp::reply::json(&res.unwrap())
        });
    let routes = routes.or(rand);

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

    let routes = routes.with(warp::cors().allow_any_origin());

    let log = warp::log("obweb::api");
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
