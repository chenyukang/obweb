extern crate base;
use base::rss;
use clap::{App, Arg};
use std::error::Error;

fn main() -> Result<(), Box<dyn Error>> {
    let matches = App::new("Rss-reader")
        .version("0.1")
        .author("yukang <moorekang@gmail.com>")
        .about("Rss Reader in Rust")
        .arg(Arg::new("debug").short('d').help("turns on debugging mode"))
        .arg(Arg::new("update").short('u').help("Update and fetch rss"))
        .arg(
            Arg::new("remove")
                .short('r')
                .help("Remove all the pages for a feed"),
        )
        .arg(Arg::new("single").short('s').help("Force fetch a feed"))
        .arg(Arg::new("force").short('f').help("Force fetch rss"))
        .get_matches();

    if matches.is_present("update") {
        rss::update_rss(None, matches.is_present("force"))?;
    } else if let Some(feed) = matches.value_of("remove") {
        rss::remove_pages_from(feed)?;
    } else if let Some(feed) = matches.value_of("single") {
        rss::update_rss(Some(feed), true)?;
    }
    Ok(())
}
