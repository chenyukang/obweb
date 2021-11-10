extern crate base;
use base::rss;
use clap::App;

fn main() {
    let matches = App::new("Rss-reader")
        .version("0.1")
        .author("yukang <moorekang@gmail.com>")
        .about("Rss Reader in Rust")
        .arg("-u, --update    'Update and fetch rss'")
        .get_matches();

    let update = matches.occurrences_of("update");
    if update > 0 {
        rss::update_rss();
    }
}
