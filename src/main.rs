use std::env;
use std::io::Write;
use std::net::Ipv4Addr;
use std::process::{Command, Stdio};
use warp::Filter;

use serde::Deserialize;

#[derive(Deserialize, Debug)]
pub struct Request {
    pub date: String,
    pub topic: String,
    pub text: String,
    pub image: String,
}

pub fn image_process(buf: &Vec<u8>) -> Vec<u8> {
    let mut child = Command::new("./lib/wasmedge-tensorflow-lite")
        .arg("./lib/grayscale.wasm")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .expect("failed to execute child");
    {
        // limited borrow of stdin
        let stdin = child.stdin.as_mut().expect("failed to get stdin");
        stdin.write_all(buf).expect("failed to write to stdin");
    }
    let output = child.wait_with_output().expect("failed to wait on child");
    output.stdout
}

#[tokio::main]
pub async fn run_server(port: u16) {
    pretty_env_logger::init();
    let routes = warp::path!("api" / "entry")
        .and(warp::post())
        .and(warp::body::json())
        .map(|request: Request| {
            format!("This is request: {:?}", request)
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
        Err(_) => 9004,
    };

    run_server(_port);
}
