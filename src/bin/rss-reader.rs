extern crate base;
use base::rss;
use clap::App;

fn main() {
    let matches = App::new("Rss-reader")
        .version("0.1")
        .author("yukang <moorekang@gmail.com>")
        .about("Rss Reader in Rust")
        .arg("-u, --update    'Update and fetch rss'")
        .arg("-r, --remove=[FEED]    'Remove all the pages for a feed'")
        .get_matches();

    if matches.is_present("update") {
        rss::update_rss();
    } else if let Some(feed) = matches.value_of("remove") {
        rss::clear_for_feed(feed);
    }
}
