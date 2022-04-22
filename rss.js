const sqlite = require('better-sqlite3');
const { assert } = require('koa/lib/context');
const fs = require('fs')
const axios = require('axios')

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

function initRssDB(db_path) {
    if (!fs.existsSync(db_path)) {
        const RSSDB = new sqlite(db_path);
        RSSDB.prepare(initdb_sql).run();
        RSSDB.prepare(`CREATE UNIQUE INDEX idx_pages_link ON pages(link)`).run();
    }
}

function fetchFeed(feed_url) {
    axios
        .get(feed_url)
        .then(res => {
            console.log(`statusCode: ${res.status}`)
            console.log(res)
            let body = res.data;
            console.log(body);
        })
        .catch(error => {
            console.error(error)
        })
}

module.exports = {
    initRssDB,
    fetchFeed
}