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

static ACCOUNT_DB: &'static str = "./db/account";
static TOKENS_DB: &'static str = "./db/tokens";

pub fn verify_user(user: &User) -> bool {
    let hash = fs::read_to_string(ACCOUNT_DB);
    if hash.is_ok() {
        let combine = format!("{}:{}", user.username, user.password);
        argon2::verify_encoded(&hash.unwrap(), &combine.as_bytes()).unwrap()
    } else {
        // If ACCOUNT_DB haven't initialized, create it, and then return true
        // This will only happen when the first time user login
        write_user_pass(&user.username, &user.password);
        true
    }
}

pub fn verify_token(token: &str) -> Option<bool> {
    //Don't need to verify token if it's empty
    if !Path::new(ACCOUNT_DB).exists() {
        return Some(true);
    }
    let data = fs::read_to_string(TOKENS_DB).unwrap();
    let tokens: Vec<&str> = data.split("\n").collect();
    Some(tokens.iter().any(|&t| t == token))
}

fn hash(password: &[u8]) -> String {
    let salt = rand::thread_rng().gen::<[u8; 32]>();
    let config = Config::default();
    //println!("{:?} {:?}", salt, config);
    argon2::hash_encoded(password, &salt, &config).unwrap()
}

pub fn gen_token() -> String {
    let path = Path::new(TOKENS_DB);
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
    write_user_pass(&username, &password)
}

fn write_user_pass(username: &str, password: &str) {
    let combine = format!("{}:{}", username, password);
    let hashed = hash(&combine.as_bytes());
    fs::write(ACCOUNT_DB, hashed).unwrap();
}
