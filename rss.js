const sqlite = require('better-sqlite3');
const fs = require('fs')
const path = require('path')
let Parser = require('rss-parser');

let initdb_sql = `
CREATE TABLE IF NOT EXISTS pages(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title String NOT NULL,
    link String NOT NULL,
    website String,
    publish_datetime String,
    readed Boolean,
    source String NOT NULL)
`;

function rssDB(db_path) {
    if (!fs.existsSync(db_path)) {
        const RSSDB = new sqlite(db_path);
        RSSDB.prepare(initdb_sql).run();
        RSSDB.prepare(`CREATE UNIQUE INDEX idx_pages_link ON pages(link)`).run();
    }
    return new sqlite(db_path);
}

function get_rss_page(link, db_path) {
    return rssDB(db_path).prepare(`SELECT * FROM pages WHERE link = ?`).all(link);
}

async function fetchFeed(feed_url, db_path) {
    let parser = new Parser();
    let res = [];
    let feed = await parser.parseURL(feed_url);
    //console.log(feed.title);
    feed.items.forEach(item => {
        //console.log(item.title + ':' + item.link)
        res.push(item);
        let pre = get_rss_page(item.link, db_path);
        if (pre.length == 0) {
            let res = rssDB(db_path).prepare(
                "INSERT INTO pages (title, link, website, publish_datetime, readed, source) values (?, ?, ?, ?, ?, ?)",
            ).run(item.title, item.link, item.link, item.pubDate, 0, feed_url);
            console.log(res);
            let page = get_rss_page(item.link, db_path)[0];
            let page_path = path.resolve(`./pages/${page.id}.html`);
            console.log(page_path);
            fs.writeFileSync(page_path, item.content);
        }
    });

    return res;
}

module.exports = {
    rssDB,
    fetchFeed
}