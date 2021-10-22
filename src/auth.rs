use argon2::{self, Config};
use dialoguer::Password;
use dialoguer::{theme::ColorfulTheme, Input};
use rand::Rng;
use serde::Deserialize;
use std::fs;
use std::fs::File;
use std::path::Path;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct User {
    username: String,
    password: String,
}

pub fn verify_user(user: &User) -> bool {
    let hash = fs::read_to_string("./db/account").unwrap();
    let combine = format!("{}:{}", user.username, user.password);
    argon2::verify_encoded(&hash, &combine.as_bytes()).unwrap()
}

pub fn verify_token(token: &str) -> Option<bool> {
    let account = "./db/account";
    if !Path::new(account).exists() {
        return None;
    }
    let data = fs::read_to_string("./db/tokens").unwrap();
    let tokens: Vec<&str> = data.split("\n").collect();
    Some(tokens.iter().any(|&t| t == token))
}

pub fn hash(password: &[u8]) -> String {
    let salt = rand::thread_rng().gen::<[u8; 32]>();
    let config = Config::default();
    //println!("{:?} {:?}", salt, config);
    argon2::hash_encoded(password, &salt, &config).unwrap()
}

pub fn gen_token() -> String {
    let path = Path::new("./db/tokens");
    let mut prev_data = String::new();
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
    let token = Uuid::new_v4().to_string();
    fs::write(path, format!("{}{}", prev_data, token)).unwrap();
    token
}

pub fn init_password() {
    let username: String = Input::with_theme(&ColorfulTheme::default())
        .with_prompt("UserName:")
        .interact_text()
        .unwrap();
    let password = Password::new()
        .with_prompt("Password:")
        .with_confirmation("Confirm password", "Password mismatching")
        .interact()
        .unwrap();

    let combine = format!("{}:{}", username, password);
    let hashed = hash(&combine.as_bytes());
    fs::write("./db/account", hashed).unwrap();
}
